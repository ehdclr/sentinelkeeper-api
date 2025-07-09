// src/database/strategies/database-strategy.abstract.ts
import {
  DatabaseConfig,
  DatabasePool,
  ConnectionTestResult,
  DatabaseConnectionError,
  DatabaseSchemaError,
} from '../types/database.type';
import { Logger } from '@nestjs/common';

export abstract class DatabaseStrategy {
  protected readonly logger = new Logger(this.constructor.name);

  abstract get type(): DatabaseConfig['type'];

  /**
   * 데이터베이스 연결 생성
   */
  abstract createConnection(config: DatabaseConfig): Promise<DatabasePool>;

  /**
   * 연결 테스트
   */
  abstract testConnection(
    config: DatabaseConfig,
  ): Promise<ConnectionTestResult>;

  /**
   * 테이블 생성
   */
  abstract createTables(pool: DatabasePool): Promise<void>;

  /**
   * 테이블 존재 여부 확인
   */
  abstract checkTablesExist(pool: DatabasePool): Promise<boolean>;

  /**
   * 초기 데이터 설정
   */
  abstract setupInitialData(pool: DatabasePool): Promise<void>;

  /**
   * 연결 정리
   */
  abstract cleanup(pool: DatabasePool): Promise<void>;

  /**
   * 헬스체크
   */
  abstract healthCheck(pool: DatabasePool): Promise<boolean>;

  /**
   * 재시도 로직이 포함된 실행
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error as Error;
        this.logger.warn(
          `Attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
        );

        if (attempt < maxAttempts) {
          await this.sleep(delay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * 지연 함수
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 에러 래핑
   */
  protected wrapConnectionError(error: Error): DatabaseConnectionError {
    return new DatabaseConnectionError(this.type, error);
  }

  protected wrapSchemaError(
    operation: string,
    error: Error,
  ): DatabaseSchemaError {
    return new DatabaseSchemaError(operation, error);
  }
}
