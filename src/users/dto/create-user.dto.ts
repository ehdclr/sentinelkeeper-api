import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email: z.string().email().optional(),
  isSystemAdmin: z.boolean().default(false),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
