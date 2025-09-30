#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import http from 'http';
import { URL } from 'url';
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DockerClient } from './docker-client.js';
import {
  ListContainersSchema,
  ReadLogsSchema,
  InspectContainerSchema,
  ContainerStatsSchema,
  ExecCommandSchema
} from './validation.js';
import { 
  DockerNotAvailableError, 
  ContainerNotFoundError,
  formatDockerError 
} from './errors.js';

const server = new Server(
  {
    name: 'docker-reader-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

const dockerClient = new DockerClient();

// Tool: List containers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'docker_list_containers',
        description: 'List Docker containers (running by default, optionally include stopped)',
        inputSchema: {
          type: 'object',
          properties: {
            all: {
              type: 'boolean',
              description: 'Include stopped containers (default: false)',
            },
          },
        },
      },
      {
        name: 'docker_read_logs',
        description: 'Read logs from a Docker container',
        inputSchema: {
          type: 'object',
          properties: {
            container: {
              type: 'string',
              description: 'Container ID or name',
            },
            lines: {
              type: 'number',
              description: 'Number of lines to retrieve (default: 100)',
            },
            since: {
              type: 'string',
              description: 'Show logs since timestamp (e.g. "2013-01-02T13:23:37Z" or "42m")',
            },
            until: {
              type: 'string',
              description: 'Show logs before timestamp',
            },
            timestamps: {
              type: 'boolean',
              description: 'Show timestamps (default: false)',
            },
          },
          required: ['container'],
        },
      },
      {
        name: 'docker_inspect_container',
        description: 'Get detailed information about a Docker container',
        inputSchema: {
          type: 'object',
          properties: {
            container: {
              type: 'string',
              description: 'Container ID or name',
            },
          },
          required: ['container'],
        },
      },
      {
        name: 'docker_container_stats',
        description: 'Get resource usage statistics for a Docker container',
        inputSchema: {
          type: 'object',
          properties: {
            container: {
              type: 'string',
              description: 'Container ID or name',
            },
          },
          required: ['container'],
        },
      },
      {
        name: 'docker_exec_command',
        description: 'Execute a command in a running Docker container',
        inputSchema: {
          type: 'object',
          properties: {
            container: {
              type: 'string',
              description: 'Container ID or name',
            },
            command: {
              type: 'array',
              items: { type: 'string' },
              description: 'Command to execute as an array (e.g., ["ls", "-la", "/app"])',
            },
            workingDir: {
              type: 'string',
              description: 'Working directory inside the container (must be absolute path)',
            },
            env: {
              type: 'array',
              items: { type: 'string' },
              description: 'Environment variables in KEY=VALUE format',
            },
            user: {
              type: 'string',
              description: 'User to run command as (format: user[:group] or uid[:gid])',
            },
            privileged: {
              type: 'boolean',
              description: 'Run in privileged mode (default: false)',
            },
            interactive: {
              type: 'boolean',
              description: 'Run in interactive mode with TTY (default: false)',
            },
          },
          required: ['container', 'command'],
        },
      },
    ],
  };
});

// Tool: Call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!(await dockerClient.isDockerAvailable())) {
      throw new DockerNotAvailableError();
    }

    switch (request.params.name) {
      case 'docker_list_containers': {
        const args = ListContainersSchema.parse(request.params.arguments || {});
        const containers = await dockerClient.listContainers(args.all);
        
        const tableHeaders = ['ID', 'Name', 'Image', 'Status', 'Ports', 'Created'];
        const tableRows = containers.map(c => [
          c.id.substring(0, 12),
          c.name,
          c.image,
          c.status,
          c.ports || 'N/A',
          c.created
        ]);

        const formatTable = (headers: string[], rows: string[][]) => {
          const colWidths = headers.map((header, i) => 
            Math.max(header.length, ...rows.map(row => (row[i!] || '').length))
          );
          
          const headerRow = headers.map((h, i) => h.padEnd(colWidths[i!]!)).join(' | ');
          const separator = colWidths.map(w => '-'.repeat(w!)).join(' | ');
          const dataRows = rows.map(row => 
            row.map((cell, i) => (cell || '').padEnd(colWidths[i!]!)).join(' | ')
          );
          
          return [headerRow, separator, ...dataRows].join('\n');
        };

        const tableOutput = formatTable(tableHeaders, tableRows);
        
        return {
          content: [
            {
              type: 'text',
              text: `Found ${containers.length} container${containers.length !== 1 ? 's' : ''}:\n\n${tableOutput}`,
            },
          ],
        };
      }

      case 'docker_read_logs': {
        const args = ReadLogsSchema.parse(request.params.arguments);
        const containers = await dockerClient.listContainers(true);
        const container = dockerClient.findContainerByName(containers, args.container);
        
        if (!container) {
          throw new ContainerNotFoundError(args.container);
        }

        const logs = await dockerClient.getContainerLogs({
          containerId: container.id,
          lines: args.lines,
          since: args.since,
          until: args.until,
          timestamps: args.timestamps,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Logs for container '${container.name}' (${container.id.substring(0, 12)}):\n\n${logs}`,
            },
          ],
        };
      }

      case 'docker_inspect_container': {
        const args = InspectContainerSchema.parse(request.params.arguments);
        const containers = await dockerClient.listContainers(true);
        const container = dockerClient.findContainerByName(containers, args.container);
        
        if (!container) {
          throw new ContainerNotFoundError(args.container);
        }

        const inspection = await dockerClient.inspectContainer(container.id);
        
        return {
          content: [
            {
              type: 'text',
              text: `Container inspection for '${container.name}' (${container.id.substring(0, 12)}):\n\n${JSON.stringify(inspection, null, 2)}`,
            },
          ],
        };
      }

      case 'docker_container_stats': {
        const args = ContainerStatsSchema.parse(request.params.arguments);
        const containers = await dockerClient.listContainers(false); // Only running containers for stats
        const container = dockerClient.findContainerByName(containers, args.container);

        if (!container) {
          throw new ContainerNotFoundError(args.container + ' (running)');
        }

        const stats = await dockerClient.getContainerStats(container.id);

        return {
          content: [
            {
              type: 'text',
              text: `Resource usage statistics for container '${container.name}' (${container.id.substring(0, 12)}):\n\n${stats}`,
            },
          ],
        };
      }

      case 'docker_exec_command': {
        const args = ExecCommandSchema.parse(request.params.arguments);
        const containers = await dockerClient.listContainers(false); // Only running containers can execute commands
        const container = dockerClient.findContainerByName(containers, args.container);

        if (!container) {
          throw new ContainerNotFoundError(args.container + ' (running)');
        }

        const execOptions: any = {
          containerId: container.id,
          command: args.command,
          privileged: args.privileged,
          interactive: args.interactive,
        };

        if (args.workingDir !== undefined) {
          execOptions.workingDir = args.workingDir;
        }

        if (args.env !== undefined) {
          execOptions.env = args.env;
        }

        if (args.user !== undefined) {
          execOptions.user = args.user;
        }

        const result = await dockerClient.execCommand(execOptions);

        // Format the output
        let outputText = `Executed command in container '${container.name}' (${container.id.substring(0, 12)}):\n`;
        outputText += `Command: ${args.command.join(' ')}\n`;
        outputText += `Exit Code: ${result.exitCode}\n\n`;

        if (result.stdout) {
          outputText += `STDOUT:\n${result.stdout}\n`;
        }

        if (result.stderr) {
          outputText += `\nSTDERR:\n${result.stderr}`;
        }

        if (!result.stdout && !result.stderr) {
          outputText += '(No output)';
        }

        return {
          content: [
            {
              type: 'text',
              text: outputText,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    let errorMessage: string;
    
    if (error instanceof z.ZodError) {
      errorMessage = `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    } else {
      errorMessage = formatDockerError(error);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Resources: Container information
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    if (!(await dockerClient.isDockerAvailable())) {
      return { resources: [] };
    }

    const containers = await dockerClient.listContainers(true);
    
    return {
      resources: containers.map(container => ({
        uri: `docker://container/${container.id}`,
        name: `Container: ${container.name}`,
        description: `${container.image} - ${container.status}`,
        mimeType: 'application/json',
      })),
    };
  } catch (error) {
    return { resources: [] };
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const match = uri.match(/^docker:\/\/container\/(.+)$/);
  
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const containerId = match[1];
  if (!containerId) {
    throw new Error(`Invalid container ID from URI: ${uri}`);
  }
  
  try {
    const inspection = await dockerClient.inspectContainer(containerId);
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(inspection, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to read container resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

async function main() {
  // Check if we're running in web/SSE mode via environment variable or command line arg
  const useSSE = process.env.MCP_TRANSPORT === 'sse' || process.argv.includes('--sse');
  
  if (useSSE) {
    // Use SSE transport for web-based connections (MCP Inspector)
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    
    // Store active transports by session ID
    const activeTransports = new Map<string, SSEServerTransport>();
    
    const httpServer = http.createServer();
    
    httpServer.on('request', async (req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      
      if (url.pathname === '/sse') {
        // Handle SSE connection
        const transport = new SSEServerTransport('/message', res);
        
        // Store transport by session ID for POST message routing
        activeTransports.set(transport.sessionId, transport);
        
        // Clean up when connection closes
        transport.onclose = () => {
          activeTransports.delete(transport.sessionId);
        };
        
        await server.connect(transport);
      } else if (url.pathname === '/message' && req.method === 'POST') {
        // Handle POST messages from client
        const sessionId = url.searchParams.get('sessionId');
        const transport = sessionId ? activeTransports.get(sessionId) : null;
        
        if (!transport) {
          res.writeHead(404).end('Session not found');
          return;
        }
        
        // Let the transport handle the POST message
        await transport.handlePostMessage(req, res);
      } else {
        // Serve a simple info page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>Docker Reader MCP Server</title></head>
            <body>
              <h1>Docker Reader MCP Server</h1>
              <p>Server is running on port ${port}</p>
              <p>Connect to SSE endpoint: <a href="/sse">/sse</a></p>
              <p>Use this URL in MCP Inspector: <code>http://localhost:${port}/sse</code></p>
            </body>
          </html>
        `);
      }
    });
    
    httpServer.listen(port, () => {
      console.log(`MCP Server running on port ${port} with SSE transport`);
      console.log(`Connect MCP Inspector to: http://localhost:${port}/sse`);
    });
  } else {
    // Use stdio transport for Claude desktop and command-line usage
    const transport = new StdioServerTransport();
    
    // Log to stderr so it doesn't interfere with stdio protocol
    console.error('Docker Reader MCP Server started in stdio mode');
    console.error('Waiting for MCP client connection...');
    
    await server.connect(transport);
  }
}

// Always run main when this file is executed
main().catch(console.error);