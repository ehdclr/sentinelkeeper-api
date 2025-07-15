import { z } from 'zod';

// 사용자 생성 스키마
export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email: z.string().email().optional(),
  isSystemRoot: z.boolean().default(false),
  publicKey: z.string().optional(),
  publicKeyCreatedAt: z.date().optional(),
});

// 사용자 응답 스키마
export const UserResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  isSystemRoot: z.boolean(),
  publicKey: z.string().nullable(),
  publicKeyCreatedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
