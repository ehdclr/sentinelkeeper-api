import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { SetupModule } from './setup/setup.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    CqrsModule.forRoot(),
    DatabaseModule,
    CommonModule,
    SetupModule,
    HealthModule,
    UsersModule,
  ],
  providers: [
    // 인터셉터 순서: 요청 로깅 -> 성능 -> 응답
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // 필터는 마지막에 처리
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
