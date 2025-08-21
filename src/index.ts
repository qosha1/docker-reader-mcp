#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
  ContainerStatsSchema 
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}