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
  isSystemAdmin: z.boolean(),
  pemKey: z.string(),
  pemFilePath: z.string(),
});

export type CreateRootUserResponse = z.infer<
  typeof CreateRootUserResponseSchema
>;

// 사용자 정보 응답
export const UserInfoResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  isSystemAdmin: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;

// 서비스 헬스 응답
export const UserHealthResponseSchema = z.object({
  service: z.string(),
  status: z.string(),
  timestamp: z.string(),
  endpoints: z.object({
    rootStatus: z.string(),
    createRoot: z.string(),
    health: z.string(),
  }),
});

export type UserHealthResponse = z.infer<typeof UserHealthResponseSchema>;
