import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: any) => {
        // 이미 ApiResponse 형식이고 statusCode가 있으면 그대로 사용
        if (data && typeof data === 'object' && 'statusCode' in data) {
          response.status(data.statusCode);
          return {
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        // 일반 응답인 경우에만 기본 처리
        const statusCode = response.statusCode;
        response.status(statusCode);

        return {
          success: true,
          message: 'Success',
          data,
          statusCode,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
