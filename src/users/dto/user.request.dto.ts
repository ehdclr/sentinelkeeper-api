import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
  email: z.string().optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
