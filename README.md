# Docker Reader MCP Server

A fully self-sustaining Model Context Protocol (MCP) server that provides AI agents with seamless access to Docker container logs and information for debugging and monitoring purposes.

## Features

🐳 **Container Management**
- List all containers (running and stopped)
- Inspect container details and configuration
- Get real-time resource usage statistics

📋 **Log Access**
- Read container logs with configurable options
- Support for timestamps, line limits, and time ranges
- Efficient log retrieval for debugging

🔧 **AI-Friendly**
- Simple integration with AI agents
- Structured data output
- Comprehensive error handling
- No user interaction required

## Installation

### Prerequisites
- Node.js 18+ 
- Docker installed and running
- Appropriate Docker permissions

### Quick Setup

```bash
# Clone and install
git clone <repository>
cd docker-reader-mcp
npm install

# Build the server
npm run build

# Test the server
npm run dev
```

## Usage with AI Agents

### Configuration for Claude Code

Add to your MCP configuration file:

```json
{
  "mcpServers": {
    "docker-reader": {
      "command": "node",
      "args": ["/path/to/docker-reader-mcp/dist/index.js"],
      "description": "Docker container log reader and inspector"
    }
  }
}
```

### Django Development Example

For a Django project with multiple containers (django, celery, celery-beat, postgres, redis), the AI agent can now:

```
Agent: "Show me all running containers"
# Uses: docker_list_containers

Agent: "Get the last 50 lines of django container logs"
# Uses: docker_read_logs with container="django" and lines=50

Agent: "Check if there are any errors in celery logs from the last hour"
# Uses: docker_read_logs with container="celery" and since="1h"
```

## Available Tools

### `docker_list_containers`
Lists Docker containers with their status and details.

**Parameters:**
- `all` (boolean, optional): Include stopped containers (default: false)

**Example:**
```json
{
  "name": "docker_list_containers",
  "arguments": {
    "all": true
  }
}
```

### `docker_read_logs`
Retrieves logs from a specific container.

**Parameters:**
- `container` (string, required): Container ID or name
- `lines` (number, optional): Number of lines to retrieve (default: 100, max: 10000)
- `since` (string, optional): Show logs since timestamp (e.g., "1h", "30m", "2024-01-01T10:00:00Z")
- `until` (string, optional): Show logs before timestamp
- `timestamps` (boolean, optional): Include timestamps (default: false)

**Example:**
```json
{
  "name": "docker_read_logs",
  "arguments": {
    "container": "my-django-app",
    "lines": 200,
    "since": "1h",
    "timestamps": true
  }
}
```

### `docker_inspect_container`
Gets detailed information about a container.

**Parameters:**
- `container` (string, required): Container ID or name

**Example:**
```json
{
  "name": "docker_inspect_container",
  "arguments": {
    "container": "postgres-db"
  }
}
```

### `docker_container_stats`
Retrieves resource usage statistics for a running container.

**Parameters:**
- `container` (string, required): Container ID or name

**Example:**
```json
{
  "name": "docker_container_stats",
  "arguments": {
    "container": "redis-cache"
  }
}
```

## Resources

The server also exposes container information as MCP resources:

- `docker://container/{container-id}`: Detailed container inspection data

## Error Handling

The server provides comprehensive error handling for:

- **Docker not available**: Clear message when Docker isn't installed/running
- **Permission denied**: Guidance on Docker permissions
- **Container not found**: Specific error when containers don't exist
- **Invalid arguments**: Detailed validation error messages
- **Container not running**: Helpful hints for accessing stopped containers

## Architecture

```
src/
├── index.ts           # Main MCP server implementation
├── docker-client.ts   # Docker command wrapper and utilities
├── validation.ts      # Input validation schemas
└── errors.ts          # Custom error types and formatting
```

### Key Design Principles

1. **Self-Sustaining**: No user interaction required during operation
2. **Robust Error Handling**: Comprehensive validation and error reporting
3. **Efficient**: Minimal overhead for log access and container queries
4. **Secure**: Input validation and safe Docker command execution
5. **Modular**: Clean separation of concerns for maintainability

## Development

### Scripts

```bash
npm run build      # Build TypeScript to JavaScript
npm run dev        # Run in development mode with tsx
npm run start      # Run the built server
npm run typecheck  # Type checking only
npm run lint       # Code linting
```

### Testing

```bash
# Test with a running container
docker run -d --name test-container nginx
node dist/index.js

# In another terminal, test MCP calls
# (Use MCP client or testing tool)
```

## Security Considerations

- The server only reads Docker information and logs
- No container manipulation capabilities
- Input validation prevents command injection
- Requires appropriate Docker permissions

## Troubleshooting

### Common Issues

**"Docker is not available"**
- Ensure Docker is installed and running
- Check if `docker --version` works in your terminal

**"Permission denied"**
- Add your user to the docker group: `sudo usermod -aG docker $USER`
- Or run with appropriate privileges

**"Container not found"**
- Use `docker ps -a` to list all containers
- Check container names and IDs
- Ensure you're using the correct container identifier

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.