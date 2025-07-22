import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    try {
      const result = this.schema.safeParse(value);
      if (!result.success) {
        throw new BadRequestException({
          message: '검증 실패',
          error: '잘못된 요청',
          details: result.error.errors.map(
            (err) => `${err.path.join('.')}: ${err.message}`,
          ),
        });
      }
      return result.data;
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });

        throw new BadRequestException({
          message: '검증 실패',
          error: '잘못된 요청',
          details: errorMessages,
        });
      }
      throw new Error('ZodValidationPipe: 예상치 못한 오류가 발생했습니다.');
    }
  }
}
