import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly slowRequestThreshold = 1000; // 1초
  private readonly memoryThreshold = 50 * 1024 * 1024; // 50MB

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

        // 느린 요청 경고
        if (duration > this.slowRequestThreshold) {
          this.logger.warn(
            `🐌 Slow Request: ${request.method} ${request.originalUrl} - ${duration}ms`
          );
        }

        // 메모리 사용량 경고
        if (memoryUsed > this.memoryThreshold) {
          this.logger.warn(
            `🧠 High Memory Usage: ${request.method} ${request.originalUrl} - ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`
          );
        }

        // 디버그 레벨에서 상세 성능 정보
        this.logger.debug(`Performance: ${request.method} ${request.originalUrl}`, {
          duration: `${duration}ms`,
          memoryUsed: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
          timestamp: new Date().toISOString(),
        });
      })
    );
  }
} 