import { z } from 'zod';
//어떤 DTO가 들어올지 모르기때문에 제네릭으로 처리
export const ApiResponseSchema = <T>(dataSchmea: z.ZodType<T>) =>
  z.object({
    success: z.boolean(),
    data: dataSchmea.optional(),
    message: z.string().optional(),
    errors: z.array(z.string()).optional(),
  });
