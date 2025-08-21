# Changelog

All notable changes to the Docker Reader MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-21

### Added
- Initial release of Docker Reader MCP
- `docker_list_containers` tool for listing Docker containers
- `docker_read_logs` tool for reading container logs with filtering options
- `docker_inspect_container` tool for detailed container inspection
- `docker_container_stats` tool for real-time resource usage statistics
- MCP resources support for container metadata via `docker://container/{id}` URIs
- Comprehensive error handling and input validation
- TypeScript support with full type safety
- Automatic GitHub Actions workflow for npm publishing
- Docker integration testing in CI/CD pipeline

### Features
- **Self-Sustaining**: No user interaction required during operation
- **Production Ready**: Comprehensive error handling and validation
- **AI-Friendly**: Structured output perfect for AI agents
- **Efficient**: Minimal overhead for log access and container queries
- **Secure**: Input validation and safe Docker command execution
- **Modular**: Clean separation of concerns for maintainability

### Tools
- **docker_list_containers**: List running or all containers with detailed information
- **docker_read_logs**: Read logs with options for lines, timestamps, and time filtering
- **docker_inspect_container**: Get complete container configuration and metadata
- **docker_container_stats**: Real-time CPU, memory, and I/O usage statistics

### Resources
- Container metadata accessible as MCP resources
- JSON-formatted container inspection data
- Seamless integration with MCP resource system

### Requirements
- Node.js 18.0.0 or higher
- Docker installed and running
- Appropriate Docker permissions