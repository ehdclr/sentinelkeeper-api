// src/database/services/database-config.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { execSync } from 'child_process';
import {
  DatabaseConfig,
  SetupDatabaseDto,
  InitializationResult,
  ConnectionTestResult,
  SetupStatus,
  DatabaseConfigurationError,
  DatabaseSchemaError,
} from '../types/database.type';
import { ConfigManagerService } from './config-manager.service';
import { ConnectionManagerService } from './connection-manager.service';
import { DATABASE_CONFIG } from '../constants/database.constant';

@Injectable()
export class DatabaseConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseConfigService.name);

  constructor(
    private readonly configManager: ConfigManagerService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.configManager.loadConfig();

      // 설정이 있는 경우 테이블 확인 및 재생성
      if (this.configManager.isConfigured()) {
        await this.ensureTablesExist();
      }
    } catch (error: any) {
      // 설정이 없는 경우는 정상 상황 (첫 실행)
      if (!error.message.includes('데이터베이스 설정이 필요합니다.')) {
        this.logger.error('모듈 초기화 실패:', error);
        throw error;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.connectionManager.closeAllConnections();
    this.logger.log('DatabaseConfigService destroyed');
  }

  /**
   * 테이블 존재 여부 확인 및 필요시 재생성
   */
  private async ensureTablesExist(): Promise<void> {
    try {
      this.logger.log('테이블 존재 여부 확인 중...');
      const config = this.configManager.getConfig();

      const tablesExist = await this.connectionManager.checkTablesExist(config);

      if (!tablesExist) {
        this.logger.warn('필수 테이블이 없습니다. 자동으로 재생성합니다...');
        await this.connectionManager.createTables(config);
        await this.connectionManager.setupInitialData(config);
        this.logger.log('테이블 재생성 완료');
      } else {
        this.logger.log('모든 테이블이 존재합니다.');
      }
    } catch (error: any) {
      this.logger.error('테이블 확인/재생성 실패:', error);
      throw new DatabaseSchemaError('table verification', error);
    }
  }

  /**
   * 데이터베이스 초기화 (한 번만 가능)
   */
  async initializeDatabase(
    setupDto: SetupDatabaseDto,
  ): Promise<InitializationResult> {
    try {
      // 1. 설정 초기화
      await this.configManager.initializeConfig(setupDto);
      const config = this.configManager.getConfig();

      // 2. 연결 테스트
      this.logger.log(`${setupDto.type} 연결 테스트 중...`);
      const connectionTest =
        await this.connectionManager.testConnection(config);
      if (!connectionTest.success) {
        throw new Error(`연결 테스트 실패: ${connectionTest.error}`);
      }

      // 3. 스키마 초기화
      await this.initializeDatabaseSchema(config);

      this.logger.log(
        `데이터베이스 설정 및 스키마 초기화 완료: ${config.type}`,
      );
      this.logger.log(
        `Config file: ${process.cwd()}/${DATABASE_CONFIG.CONFIG_FILE}`,
      );
      this.logger.log(
        `Lock file: ${process.cwd()}/${DATABASE_CONFIG.LOCK_FILE}`,
      );

      return {
        success: true,
        message: `데이터베이스 설정 및 스키마 초기화 완료: ${config.type}`,
      };
    } catch (error: any) {
      this.logger.error('데이터베이스 초기화 실패:', error);
      return {
        success: false,
        message: `데이터베이스 초기화 실패: ${error.message}`,
      };
    }
  }

  /**
   * 스키마 초기화
   */
  private async initializeDatabaseSchema(
    config: DatabaseConfig,
  ): Promise<void> {
    try {
      this.logger.log(`${config.type} 스키마 초기화 시작...`);

      // 1. Drizzle Kit 시도 (선택사항)
      const drizzleSuccess = await this.tryDrizzleKitMigration();
      this.logger.debug('Drizzle Kit migration result:', drizzleSuccess);

      // 2. 수동 테이블 생성
      await this.connectionManager.createTables(config);

      // 3. 초기 데이터 설정
      await this.connectionManager.setupInitialData(config);

      this.logger.log(`${config.type} 스키마 초기화 완료`);
    } catch (error: any) {
      this.logger.error('스키마 초기화 실패:', error);
      throw new DatabaseSchemaError('schema initialization', error);
    }
  }

  /**
   * Drizzle Kit 마이그레이션 시도 (선택사항)
   */
  private async tryDrizzleKitMigration(): Promise<boolean> {
    try {
      this.logger.log('Drizzle Kit 마이그레이션 시도 중...');

      // 마이그레이션 파일 생성
      execSync('npx drizzle-kit generate', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: DATABASE_CONFIG.CONNECTION_TIMEOUT,
      });

      // 마이그레이션 적용
      execSync('npx drizzle-kit migrate', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: DATABASE_CONFIG.CONNECTION_TIMEOUT,
      });

      this.logger.log('Drizzle Kit 마이그레이션 성공');
      return true;
    } catch (error: any) {
      this.logger.warn(
        'Drizzle Kit 마이그레이션 실패, 수동 방식으로 진행...',
        error.message,
      );
      return false;
    }
  }

  /**
   * 연결 테스트
   */
  async testConnection(config?: DatabaseConfig): Promise<ConnectionTestResult> {
    const testConfig = config || this.configManager.getConfig();
    return this.connectionManager.testConnection(testConfig);
  }

  /**
   * Drizzle 인스턴스 반환
   */
  async getDb(): Promise<any> {
    const config = this.configManager.getConfig();
    return await this.connectionManager.getDrizzleInstance(config);
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): DatabaseConfig {
    return this.configManager.getConfig();
  }

  /**
   * 설정 여부 확인
   */
  isConfigured(): boolean {
    return this.configManager.isConfigured();
  }

  /**
   * 설정 상태 조회
   */
  getSetupStatus(): SetupStatus {
    return this.configManager.getSetupStatus();
  }

  /**
   * 설정 변경 시도 시 에러 반환
   */
  updateConfig(): never {
    return this.configManager.updateConfig();
  }

  /**
   * 연결 정보 조회 (디버깅용)
   */
  getConnectionInfo(): Array<{
    key: string;
    type: string;
    isHealthy: boolean;
    lastUsed: Date;
  }> {
    return this.connectionManager.getConnectionInfo();
  }

  /**
   * 특정 연결 닫기
   */
  async closeConnection(config?: DatabaseConfig): Promise<void> {
    if (config) {
      await this.connectionManager.closeConnection(config);
    } else {
      const currentConfig = this.configManager.getConfig();
      await this.connectionManager.closeConnection(currentConfig);
    }
  }
}
