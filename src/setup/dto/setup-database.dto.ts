import { z } from 'zod';

export const SetupDatabaseRequestSchema = z.object({
  type: z.enum(['sqlite', 'postgres', 'mysql']),
  host: z.string().optional(),
  port: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.string(),
  ssl: z.boolean().optional(),
});

export type SetupDatabaseDto = z.infer<typeof SetupDatabaseRequestSchema>;
