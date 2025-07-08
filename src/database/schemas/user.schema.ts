import { z } from 'zod';

// 사용자 생성 스키마
export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email: z.string().email().optional(),
  isSystemAdmin: z.boolean().default(false),
});

// 사용자 응답 스키마
export const UserResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  isSystemAdmin: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
