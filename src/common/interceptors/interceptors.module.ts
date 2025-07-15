import { Module } from '@nestjs/common';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { PerformanceInterceptor } from './performance.interceptor';

@Module({
  providers: [RequestLoggingInterceptor, PerformanceInterceptor],
  exports: [RequestLoggingInterceptor, PerformanceInterceptor],
})
export class InterceptorsModule {}
