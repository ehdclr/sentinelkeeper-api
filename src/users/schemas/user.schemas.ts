import { z } from 'zod';
import { EmailSchema, PaswordSchema } from '../../common/schemas/base.schema';


export const CreateUserSchema = z.object({
  name: z.string().min(3).max(50),
  email: EmailSchema,
  password: PaswordSchema,
  role:
})





