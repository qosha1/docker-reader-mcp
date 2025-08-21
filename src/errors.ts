export class DockerError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DockerError';
  }
}

export class ContainerNotFoundError extends DockerError {
  constructor(containerIdentifier: string) {
    super(`Container '${containerIdentifier}' not found`, 'CONTAINER_NOT_FOUND');
    this.name = 'ContainerNotFoundError';
  }
}

export class DockerNotAvailableError extends DockerError {
  constructor() {
    super('Docker is not available. Please ensure Docker is installed and running.', 'DOCKER_NOT_AVAILABLE');
    this.name = 'DockerNotAvailableError';
  }
}

export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

export function isDockerPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('permission denied') || 
         error.message.includes('Cannot connect to the Docker daemon');
}

export function isContainerNotRunningError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('is not running') ||
         error.message.includes('container is not running');
}

export function formatDockerError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unknown error occurred';
  }

  if (isDockerPermissionError(error)) {
    return 'Docker permission denied. Please ensure your user has permission to access Docker or run with appropriate privileges.';
  }

  if (isContainerNotRunningError(error)) {
    return 'Container is not running. Use "all: true" to include stopped containers.';
  }

  if (error.message.includes('No such container')) {
    return 'Container not found. Check the container name or ID and try again.';
  }

  if (error.message.includes('command not found')) {
    return 'Docker command not found. Please ensure Docker is installed and in your PATH.';
  }

  return error.message;
}