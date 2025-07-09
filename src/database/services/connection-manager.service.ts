// src/database/services/connection-manager.service.ts
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  DatabaseConfig,
  DatabasePool,
  ConnectionTestResult,
  DatabaseConnectionError,
} from '../types/database.type';
import { DatabaseStrategy } from '../strategies/database-strategy.abstract';
import { PostgresStrategy } from '../strategies/postgres.strategy';
import { SQLiteStrategy } from '../strategies/sqlite.strategy';
import { MySQLStrategy } from '../strategies/mysql.strategy';

@Injectable()
export class ConnectionManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private readonly pools = new Map<string, DatabasePool>();
  private readonly strategies = new Map<string, DatabaseStrategy>();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    private readonly postgresStrategy: PostgresStrategy,
    private readonly sqliteStrategy: SQLiteStrategy,
    private readonly mysqlStrategy: MySQLStrategy,
  ) {
    this.initializeStrategies();
    this.startHealthCheck();
  }

  private initializeStrategies(): void {
    this.strategies.set('postgres', this.postgresStrategy);
    this.strategies.set('sqlite', this.sqliteStrategy);
    this.strategies.set('mysql', this.mysqlStrategy);
  }

  /**
   * 설정 기반 연결 키 생성
   */
  private getConnectionKey(config: DatabaseConfig): string {
    switch (config.type) {
      case 'sqlite':
        return `sqlite:${config.database}`;
      case 'postgres':
      case 'mysql':
        return `${config.type}:${config.host}:${config.port}:${config.database}`;
      default:
        throw new Error(`Unsupported database type: ${(config as any).type}`);
    }
  }

  /**
   * 연결 가져오기 (싱글톤)
   */
  async getConnection(config: DatabaseConfig): Promise<DatabasePool> {
    const key = this.getConnectionKey(config);

    // 기존 연결이 있고 건강한 경우 재사용
    if (this.pools.has(key)) {
      const pool = this.pools.get(key)!;

      if (pool.isHealthy) {
        pool.lastUsed = new Date();
        this.logger.debug(`Reusing existing connection: ${key}`);
        return pool;
      } else {
        this.logger.warn(`Unhealthy connection detected, recreating: ${key}`);
        await this.closeConnection(key);
      }
    }

    // 새 연결 생성
    const strategy = this.strategies.get(config.type);
    if (!strategy) {
      throw new DatabaseConnectionError(
        config.type,
        new Error(`No strategy found for database type: ${config.type}`),
      );
    }

    try {
      const pool = await strategy.createConnection(config);
      this.pools.set(key, pool);

      this.logger.log(`New connection created: ${key}`);
      return pool;
    } catch (error) {
      this.logger.error(`Failed to create connection: ${key}`, error);
      throw error;
    }
  }

  /**
   * 연결 테스트
   */
  async testConnection(config: DatabaseConfig): Promise<ConnectionTestResult> {
    const strategy = this.strategies.get(config.type);
    if (!strategy) {
      return {
        success: false,
        error: `No strategy found for database type: ${config.type}`,
      };
    }

    return strategy.testConnection(config);
  }

  /**
   * 테이블 생성
   */
  async createTables(config: DatabaseConfig): Promise<void> {
    const strategy = this.strategies.get(config.type);
    if (!strategy) {
      throw new Error(`No strategy found for database type: ${config.type}`);
    }

    const pool = await this.getConnection(config);
    await strategy.createTables(pool);
  }

  /**
   * 테이블 존재 여부 확인
   */
  async checkTablesExist(config: DatabaseConfig): Promise<boolean> {
    const strategy = this.strategies.get(config.type);
    if (!strategy) {
      throw new Error(`No strategy found for database type: ${config.type}`);
    }

    const pool = await this.getConnection(config);
    return strategy.checkTablesExist(pool);
  }

  /**
   * 초기 데이터 설정
   */
  async setupInitialData(config: DatabaseConfig): Promise<void> {
    const strategy = this.strategies.get(config.type);
    if (!strategy) {
      throw new Error(`No strategy found for database type: ${config.type}`);
    }

    const pool = await this.getConnection(config);
    await strategy.setupInitialData(pool);
  }

  /**
   * Drizzle 인스턴스 가져오기
   */
  async getDrizzleInstance(config: DatabaseConfig): Promise<any> {
    const pool = await this.getConnection(config);
    return pool.drizzle;
  }

  /**
   * 특정 연결 닫기
   */
  async closeConnection(keyOrConfig: string | DatabaseConfig): Promise<void> {
    const key =
      typeof keyOrConfig === 'string'
        ? keyOrConfig
        : this.getConnectionKey(keyOrConfig);

    const pool = this.pools.get(key);
    if (!pool) {
      return;
    }

    const strategy = this.strategies.get(pool.type);
    if (strategy) {
      await strategy.cleanup(pool);
    }

    this.pools.delete(key);
    this.logger.log(`Connection closed: ${key}`);
  }

  /**
   * 모든 연결 닫기
   */
  async closeAllConnections(): Promise<void> {
    const promises = Array.from(this.pools.keys()).map((key) =>
      this.closeConnection(key),
    );

    await Promise.allSettled(promises);
    this.logger.log('All connections closed');
  }

  /**
   * 헬스체크 시작
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // 30초마다 헬스체크
  }

  /**
   * 헬스체크 수행
   */
  private async performHealthCheck(): Promise<void> {
    const promises = Array.from(this.pools.entries()).map(
      async ([key, pool]) => {
        try {
          const strategy = this.strategies.get(pool.type);
          if (strategy) {
            const isHealthy = await strategy.healthCheck(pool);
            if (!isHealthy) {
              this.logger.warn(`Unhealthy connection detected: ${key}`);
            }
          }
        } catch (error) {
          this.logger.error(`Health check failed for ${key}:`, error);
          pool.isHealthy = false;
        }
      },
    );

    await Promise.allSettled(promises);
  }

  /**
   * 연결 상태 정보
   */
  getConnectionInfo(): Array<{
    key: string;
    type: string;
    isHealthy: boolean;
    lastUsed: Date;
  }> {
    return Array.from(this.pools.entries()).map(([key, pool]) => ({
      key,
      type: pool.type,
      isHealthy: pool.isHealthy,
      lastUsed: pool.lastUsed,
    }));
  }

  /**
   * 모듈 종료 시 정리
   */
  async onModuleDestroy(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    await this.closeAllConnections();
    this.logger.log('ConnectionManagerService destroyed');
  }
}
