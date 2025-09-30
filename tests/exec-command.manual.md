# Manual Test Guide for docker_exec_command

This document provides manual testing instructions for the `docker_exec_command` tool.

## Prerequisites

- Docker installed and running
- A running container for testing (e.g., `docker run -d --name test-container nginx`)

## Test Cases

### 1. Basic Command Execution

Execute a simple command:

```json
{
  "container": "test-container",
  "command": ["echo", "Hello World"]
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: "Hello World"

### 2. List Directory Contents

```json
{
  "container": "test-container",
  "command": ["ls", "-la", "/etc"]
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: Directory listing of /etc

### 3. Working Directory Option

```json
{
  "container": "test-container",
  "command": ["pwd"],
  "workingDir": "/usr/share/nginx"
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: "/usr/share/nginx"

### 4. Environment Variables

```json
{
  "container": "test-container",
  "command": ["sh", "-c", "echo $CUSTOM_VAR"],
  "env": ["CUSTOM_VAR=test_value"]
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: "test_value"

### 5. User Option

```json
{
  "container": "test-container",
  "command": ["whoami"],
  "user": "root"
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: "root"

### 6. Command with Non-Zero Exit Code

```json
{
  "container": "test-container",
  "command": ["ls", "/nonexistent"]
}
```

**Expected Result:**
- Exit code: 2 (or similar non-zero)
- STDERR: Error message about directory not found

### 7. Multiple Arguments

```json
{
  "container": "test-container",
  "command": ["sh", "-c", "echo arg1 && echo arg2 && echo arg3"]
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: "arg1\narg2\narg3"

### 8. Special Characters in Arguments

```json
{
  "container": "test-container",
  "command": ["echo", "hello 'world'"]
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: "hello 'world'"

### 9. Complex Command with Pipes

```json
{
  "container": "test-container",
  "command": ["sh", "-c", "ls -la / | head -5"]
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: First 5 lines of directory listing

### 10. Privileged Mode (if needed)

```json
{
  "container": "test-container",
  "command": ["mount"],
  "privileged": true
}
```

**Expected Result:**
- Exit code: 0
- STDOUT: List of mounted filesystems

## Error Cases to Test

### 1. Non-existent Container

```json
{
  "container": "nonexistent-container",
  "command": ["echo", "test"]
}
```

**Expected Result:** Error message indicating container not found

### 2. Invalid Command Format

```json
{
  "container": "test-container",
  "command": []
}
```

**Expected Result:** Validation error about empty command

### 3. Invalid Working Directory Format

```json
{
  "container": "test-container",
  "command": ["pwd"],
  "workingDir": "relative/path"
}
```

**Expected Result:** Validation error about absolute path required

### 4. Invalid Environment Variable Format

```json
{
  "container": "test-container",
  "command": ["env"],
  "env": ["INVALID"]
}
```

**Expected Result:** Validation error about KEY=VALUE format

### 5. Stopped Container

```json
{
  "container": "stopped-container",
  "command": ["echo", "test"]
}
```

**Expected Result:** Error message indicating container is not running

## Setup for Testing

```bash
# Create a test container
docker run -d --name test-container nginx

# Verify container is running
docker ps | grep test-container

# After testing, clean up
docker stop test-container
docker rm test-container
```

## Testing with MCP Inspector

1. Start the server in SSE mode:
   ```bash
   npm run inspector
   ```

2. Open the MCP Inspector in your browser

3. Use the tool interface to test the `docker_exec_command` tool with the test cases above

## Integration Testing with Claude Desktop

1. Configure the MCP server in Claude Desktop config

2. Start a conversation and test commands like:
   - "Execute 'ls -la /' in the test-container"
   - "Run 'pwd' in test-container with working directory /etc"
   - "Execute 'env' in test-container with custom environment variable"

## Performance Considerations

- Commands should complete within a reasonable timeout (default 2 minutes)
- Large outputs should be handled gracefully
- Interactive commands (requiring input) are not supported in non-interactive mode