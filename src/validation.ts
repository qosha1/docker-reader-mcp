import { z } from 'zod';

export const ContainerNameSchema = z.string()
  .min(1, 'Container name cannot be empty')
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'Invalid container name format');

export const ContainerIdSchema = z.string()
  .min(1, 'Container ID cannot be empty')
  .regex(/^[a-fA-F0-9]+$/, 'Invalid container ID format');

export const ContainerIdentifierSchema = z.string()
  .min(1, 'Container identifier cannot be empty')
  .refine((val) => {
    return ContainerNameSchema.safeParse(val).success || 
           ContainerIdSchema.safeParse(val).success ||
           val.startsWith('/'); // Docker container names can start with /
  }, 'Must be a valid container name or ID');

export const LogLinesSchema = z.number()
  .int('Lines must be an integer')
  .min(1, 'Lines must be at least 1')
  .max(10000, 'Lines cannot exceed 10000');

export const TimestampSchema = z.string()
  .refine((val) => {
    // Check for relative time format (e.g., "1h", "30m", "45s")
    if (/^\d+[smhd]$/.test(val)) return true;
    
    // Check for absolute timestamp formats
    if (Date.parse(val)) return true;
    
    return false;
  }, 'Invalid timestamp format. Use relative time (e.g., "1h", "30m") or ISO date');

export const ListContainersSchema = z.object({
  all: z.boolean().optional().default(false)
});

export const ReadLogsSchema = z.object({
  container: ContainerIdentifierSchema,
  lines: LogLinesSchema.optional().default(100),
  since: TimestampSchema.optional(),
  until: TimestampSchema.optional(),
  timestamps: z.boolean().optional().default(false)
});

export const InspectContainerSchema = z.object({
  container: ContainerIdentifierSchema
});

export const ContainerStatsSchema = z.object({
  container: ContainerIdentifierSchema
});

/**
 * Schema for validating command arrays
 * Must be a non-empty array of strings
 */
export const CommandSchema = z.array(z.string().min(1, 'Command arguments cannot be empty'))
  .min(1, 'Command must contain at least one element')
  .max(100, 'Command cannot exceed 100 arguments');

/**
 * Schema for validating environment variables
 * Must be in format KEY=VALUE
 */
export const EnvVarSchema = z.string()
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*=.*$/, 'Environment variable must be in format KEY=VALUE');

/**
 * Schema for validating user format
 * Can be "username" or "uid" or "username:groupname" or "uid:gid"
 */
export const UserSchema = z.string()
  .min(1, 'User cannot be empty')
  .regex(/^[a-zA-Z0-9_][a-zA-Z0-9_-]*(:([a-zA-Z0-9_][a-zA-Z0-9_-]*))?$|^\d+(:\d+)?$/,
    'User must be in format user[:group] or uid[:gid]');

/**
 * Schema for validating working directory path
 */
export const WorkingDirSchema = z.string()
  .min(1, 'Working directory cannot be empty')
  .regex(/^\//, 'Working directory must be an absolute path starting with /');

/**
 * Schema for docker exec command tool arguments
 */
export const ExecCommandSchema = z.object({
  container: ContainerIdentifierSchema,
  command: CommandSchema,
  workingDir: WorkingDirSchema.optional(),
  env: z.array(EnvVarSchema).optional(),
  user: UserSchema.optional(),
  privileged: z.boolean().optional().default(false),
  interactive: z.boolean().optional().default(false)
});