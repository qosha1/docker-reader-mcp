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