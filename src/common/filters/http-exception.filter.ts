import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Unknown error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // requestId 타입 안전하게 처리
    const requestIdHeader = response.getHeader('X-Request-ID');
    const requestId = Array.isArray(requestIdHeader) 
      ? requestIdHeader[0] 
      : requestIdHeader || 'unknown';
    
    const errorResponse: ApiResponse<any> = {
      success: false,
      message,
      error,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 에러 로깅 - 요청 ID 포함
    this.logger.error(`❌ [${requestId}] Exception caught:`, {
      path: request.url,
      method: request.method,
      statusCode: status,
      message,
      error,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // 특정 에러 타입별 추가 로깅
    this.logSpecificErrors(exception, request, String(requestId));

    response.status(status).json(errorResponse);
  }

  private logSpecificErrors(exception: unknown, request: Request, requestId: string) {
    const message = exception instanceof Error ? exception.message : String(exception);
    
    // 데이터베이스 관련 에러
    if (message.includes('database') || message.includes('connection')) {
      this.logger.error(`💾 [${requestId}] Database Error:`, {
        endpoint: request.originalUrl,
        error: message,
      });
    }

    // JSON 파싱 에러
    if (message.includes('JSON') || message.includes('parse')) {
      this.logger.error(`📄 [${requestId}] JSON Parse Error:`, {
        endpoint: request.originalUrl,
        error: message,
        contentType: request.headers['content-type'],
      });
    }

    // 인증/권한 에러
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 401 || status === 403) {
        this.logger.warn(`🔐 [${requestId}] Auth Error:`, {
          endpoint: request.originalUrl,
          ip: request.ip,
          statusCode: status,
        });
      }
    }
  }
}
