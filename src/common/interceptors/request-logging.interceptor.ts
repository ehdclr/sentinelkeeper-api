import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 요청 정보 추출
    const { method, originalUrl, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const requestId = this.generateRequestId();

    // 요청 ID를 응답 헤더에 추가
    response.setHeader('X-Request-ID', requestId);

    // 요청 시작 로그
    this.logger.log(
      `📥 [${requestId}] ${method} ${originalUrl} - ${ip} - ${userAgent.substring(0, 50)}...`
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // 성공 응답 로그
        this.logger.log(
          `📤 [${requestId}] ${method} ${originalUrl} - ${statusCode} - ${duration}ms`
        );
      })
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
