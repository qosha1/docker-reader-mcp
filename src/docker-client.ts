import { exec } from 'child_process';
import { promisify } from 'util';
import { DockerError } from './errors.js';

const execAsync = promisify(exec);

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  created: string;
  command: string;
}

export interface DockerLogOptions {
  containerId: string;
  lines?: number;
  since?: string | undefined;
  until?: string | undefined;
  timestamps?: boolean;
  follow?: boolean;
}

/**
 * Options for executing commands in a Docker container
 */
export interface DockerExecOptions {
  /** Container ID or name to execute command in */
  containerId: string;
  /** Command to execute (array of command and arguments) */
  command: string[];
  /** Working directory inside the container (optional) */
  workingDir?: string;
  /** Environment variables to set (optional) */
  env?: string[];
  /** User to run command as (optional, format: user[:group]) */
  user?: string;
  /** Run in privileged mode (optional) */
  privileged?: boolean;
  /** Run in interactive mode (allocate TTY) (optional) */
  interactive?: boolean;
}

export class DockerClient {
  async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch {
      return false;
    }
  }

  async listContainers(all = false): Promise<DockerContainer[]> {
    try {
      const allFlag = all ? '-a' : '';
      const format = '--format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.CreatedAt}}\t{{.Command}}"';
      const { stdout } = await execAsync(`docker ps ${allFlag} ${format}`);
      
      return stdout
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => {
          const [id, name, image, status, ports, created, command] = line.split('\t');
          return {
            id: id?.replace(/"/g, '') || '',
            name: name?.replace(/"/g, '') || '',
            image: image?.replace(/"/g, '') || '',
            status: status?.replace(/"/g, '') || '',
            ports: ports?.replace(/"/g, '') || '',
            created: created?.replace(/"/g, '') || '',
            command: command?.replace(/"/g, '') || ''
          };
        });
    } catch (error) {
      throw new DockerError(`Failed to list containers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getContainerLogs(options: DockerLogOptions): Promise<string> {
    try {
      const { containerId, lines, since, until, timestamps } = options;
      
      let command = `docker logs ${containerId}`;
      
      if (lines) {
        command += ` --tail ${lines}`;
      }
      
      if (since) {
        command += ` --since ${since}`;
      }
      
      if (until) {
        command += ` --until ${until}`;
      }
      
      if (timestamps) {
        command += ' --timestamps';
      }

      const { stdout, stderr } = await execAsync(command);
      
      // Docker logs can appear in both stdout and stderr
      const combinedLogs = [stdout, stderr].filter(Boolean).join('\n');
      
      return combinedLogs;
    } catch (error) {
      throw new DockerError(`Failed to get container logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async inspectContainer(containerId: string): Promise<any> {
    try {
      const { stdout } = await execAsync(`docker inspect ${containerId}`);
      return JSON.parse(stdout)[0];
    } catch (error) {
      throw new DockerError(`Failed to inspect container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getContainerStats(containerId: string): Promise<any> {
    try {
      const { stdout } = await execAsync(`docker stats ${containerId} --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"`);
      return stdout;
    } catch (error) {
      throw new DockerError(`Failed to get container stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  findContainerByName(containers: DockerContainer[], name: string): DockerContainer | undefined {
    return containers.find(container =>
      container.name === name ||
      container.name === `/${name}` ||
      container.id.startsWith(name)
    );
  }

  /**
   * Execute a command in a running Docker container
   * @param options - Execution options including container ID and command
   * @returns Object containing stdout, stderr, and exit code
   * @throws {DockerError} If the exec command fails
   */
  async execCommand(options: DockerExecOptions): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { containerId, command, workingDir, env, user, privileged, interactive } = options;

      // Build the docker exec command with options
      let dockerCommand = 'docker exec';

      // Add optional flags
      if (interactive) {
        dockerCommand += ' -it';
      }

      if (workingDir) {
        dockerCommand += ` --workdir ${this.escapeShellArg(workingDir)}`;
      }

      if (user) {
        dockerCommand += ` --user ${this.escapeShellArg(user)}`;
      }

      if (privileged) {
        dockerCommand += ' --privileged';
      }

      // Add environment variables
      if (env && env.length > 0) {
        for (const envVar of env) {
          dockerCommand += ` --env ${this.escapeShellArg(envVar)}`;
        }
      }

      // Add container ID
      dockerCommand += ` ${this.escapeShellArg(containerId)}`;

      // Add the command to execute
      for (const arg of command) {
        dockerCommand += ` ${this.escapeShellArg(arg)}`;
      }

      const { stdout, stderr } = await execAsync(dockerCommand);

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0
      };
    } catch (error: any) {
      // Docker exec returns non-zero exit codes as errors
      // We want to capture both the output and the exit code
      if (error.stdout !== undefined || error.stderr !== undefined) {
        return {
          stdout: error.stdout || '',
          stderr: error.stderr || '',
          exitCode: error.code || 1
        };
      }

      throw new DockerError(`Failed to execute command in container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Escape shell arguments to prevent command injection
   * @param arg - The argument to escape
   * @returns Escaped shell argument
   */
  private escapeShellArg(arg: string): string {
    // Replace single quotes with '\'' and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }
}