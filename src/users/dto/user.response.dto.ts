import { z } from 'zod';

// 루트 사용자 상태 응답
export const ExistsUserResponseSchema = z.object({
  exists: z.boolean(),
  count: z.number(),
});

export type ExistsUserResponse = z.infer<typeof ExistsUserResponseSchema>;

// 루트 사용자 생성 응답
export const CreateRootUserResponseSchema = z.object({
  username: z.string(),
  email: z.string().optional(),
  isSystemRoot: z.boolean(),
  pemKey: z.string(),
  pemFilePath: z.string(),
});

export interface CreateRootUserResponse {
  user: {
    username: string;
    email: string | null;
    isSystemRoot: boolean;
    createdAt: Date;
  };
  privateKeyPem: string;
  message: string;
}

// 사용자 정보 응답
export const UserInfoResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  isSystemRoot: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;

export const ResetPasswordResponseSchema = z.object({
  username: z.string(),
  message: z.string(),
  resetAt: z.string(),
});
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

// 서비스 헬스 응답
export const UserHealthResponseSchema = z.object({
  service: z.string(),
  status: z.string(),
  timestamp: z.string(),
  endpoints: z.object({
    rootStatus: z.string(),
    createRoot: z.string(),
    resetPassword: z.string(),
    health: z.string(),
  }),
});

export type UserHealthResponse = z.infer<typeof UserHealthResponseSchema>;
