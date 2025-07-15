import { z } from 'zod';

export const CreateUserRequestSchema = z.object({
  username: z.string().min(1, '사용자명은 필수입니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
  email: z.string().email('유효한 이메일 주소를 입력하세요.').optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// 복구 키 검증 요청 스키마
export const ValidateRecoveryKeyRequestSchema = z.object({
  pemContent: z.string().min(1, 'PEM 파일 내용은 필수입니다.'),
});

export type ValidateRecoveryKeyRequest = z.infer<
  typeof ValidateRecoveryKeyRequestSchema
>;

// 간소화된 패스워드 리셋 요청 스키마
export const ResetPasswordRequestSchema = z.object({
  pemContent: z.string().min(1, 'PEM 파일 내용은 필수입니다.'),
  newPassword: z.string().min(6, '새 비밀번호는 최소 6자 이상이어야 합니다.'),
});

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
