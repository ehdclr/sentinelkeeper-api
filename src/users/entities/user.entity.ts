import { z } from 'zod';
import {
  UuidSchema,
  TimestampSchema,
  EmailSchema,
} from '../../common/schemas/base.schema';

export const UserEntity = z.object({
  id: UuidSchema,
  email: EmailSchema,
  name: z.string().min(3).max(50),
  password: z.string(), //해시화 된 내용
  role: z.enum(['root', 'admin', 'maintainer', 'user']),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type User = z.infer<typeof UserEntity>;
