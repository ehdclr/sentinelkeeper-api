import { z } from 'zod';

export const SetupDatabaseSchema = z
  .object({
    type: z.enum(['sqlite', 'postgres', 'mysql'], {
      required_error: 'Database type is required',
      invalid_type_error: 'Database type must be sqlite, postgres, or mysql',
    }),
    host: z.string().optional(),
    port: z.number().int().positive().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    database: z.string().min(1, 'Database name is required'),
    ssl: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // PostgreSQL과 MySQL의 경우 host, port, username이 필수
      if (data.type === 'postgres' || data.type === 'mysql') {
        return data.host && data.port && data.username;
      }
      return true;
    },
    {
      message: 'Host, port, and username are required for PostgreSQL and MySQL',
      path: ['host'],
    },
  );

export type SetupDatabaseDto = z.infer<typeof SetupDatabaseSchema>;
