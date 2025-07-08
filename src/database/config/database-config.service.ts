import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { DatabaseConfig } from './database-config.interface';
import { SetupDatabaseDto } from '../../setup/dto/setup-database.dto';

@Injectable()
export class DatabaseConfigService implements OnModuleInit {
  private readonly configPath = join(process.cwd(), 'database-config.json');
  private readonly lockPath = join(process.cwd(), '.database-lock');
  private config: DatabaseConfig | null = null;
  private isLocked = false;

  async onModuleInit() {
    try {
      await this.initializeConfig();
    } catch (error: any) {
      // 설정이 없는 경우는 정상 상황 (첫 실행)
      if (!error.message.includes('데이터 베이스 설정이 필요합니다.')) {
        throw error;
      }
    }
  }

  private async initializeConfig(): Promise<void> {
    // 락 파일 체크
    if (existsSync(this.lockPath)) {
      this.isLocked = true;
      this.loadExistingConfig();
      return;
    }

    // 기존 설정 파일 체크
    if (existsSync(this.configPath)) {
      this.loadExistingConfig();
      this.createLockFile();
      return;
    }

    // 첫 실행 시 - 설정 대기 상태
    console.log(
      '🔧 데이터 베이스 설정이 필요합니다. /setup/database 엔드포인트를 사용하여 설정해주세요.',
    );
    throw new Error(
      '데이터 베이스 설정이 필요합니다. /setup/database 엔드포인트를 사용하여 설정해주세요.',
    );
  }

  private loadExistingConfig(): void {
    try {
      const configData = readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData) as DatabaseConfig;

      console.log('📋 Loaded config:', {
        type: this.config?.type,
        database: this.config?.database,
        hasHash: !!this.config?.hash,
        createdAt: this.config?.createdAt,
      });

      // 설정 무결성 검증 (해시가 있는 경우만)
      if (this.config?.hash) {
        if (!this.verifyConfigIntegrity()) {
          console.warn('⚠️ 설정 무결성 검증 실패, 계속 진행...');
          // 해시를 다시 계산해서 업데이트
          const { hash, ...configWithoutHash } = this.config;
          this.config.hash = this.calculateHash(configWithoutHash);
          this.saveConfig();
          console.log('🔄 설정 해시 업데이트');
        }
      } else {
        // 해시가 없는 경우 새로 생성
        console.log('🔄 해시가 없습니다, 새로운 해시 생성...');
        const { hash, ...configWithoutHash } = this.config;
        this.config.hash = this.calculateHash(configWithoutHash);
        this.saveConfig();
      }

      this.isLocked = true;
      console.log(`✅ 데이터 베이스 설정 로드 완료: ${this.config.type}`);
    } catch (error: any) {
      console.error('❌ 데이터 베이스 설정 로드 실패:', error);
      throw error;
    }
  }

  private verifyConfigIntegrity(): boolean {
    if (!this.config) return false;
    const { hash, ...configWithoutHash } = this.config;
    const calculatedHash = this.calculateHash(configWithoutHash);
    return hash === calculatedHash;
  }

  private calculateHash(config: Omit<DatabaseConfig, 'hash'>): string {
    // 해시 계산 시 일관성을 위해 정렬된 문자열 사용
    const sortedConfig = {
      type: config.type,
      database: config.database,
      host: config.host || '',
      port: config.port || 0,
      username: config.username || '',
      password: config.password || '',
      ssl: config.ssl || false,
      readonly: config.readonly,
      createdAt: config.createdAt,
    };

    const configString = JSON.stringify(sortedConfig);
    const hash = createHash('sha256').update(configString).digest('hex');

    console.log('🔐 Hash calculation:', {
      configString: configString.substring(0, 100) + '...',
      hash: hash.substring(0, 16) + '...',
    });

    return hash;
  }

  private createLockFile(): void {
    try {
      const lockData = {
        lockedAt: new Date().toISOString(),
        type: this.config?.type,
        hash: this.config?.hash,
        database: this.config?.database,
        message: '데이터 베이스 설정이 잠겨있어 변경할 수 없습니다.',
      };

      console.log(`🔒 Creating lock file at: ${this.lockPath}`);
      writeFileSync(this.lockPath, JSON.stringify(lockData, null, 2));

      // 락 파일이 실제로 생성되었는지 확인
      if (existsSync(this.lockPath)) {
        console.log(`✅ 락 파일 생성 완료`);
        this.isLocked = true;
      } else {
        throw new Error('락 파일이 생성되지 않았습니다.');
      }
    } catch (error: any) {
      console.error('❌ 락 파일 생성 실패:', error);
      throw new Error(`락 파일 생성 실패: ${error.message}`);
    }
  }

  getConfig(): DatabaseConfig {
    if (!this.config) {
      throw new Error('데이터 베이스 설정이 필요합니다.');
    }
    return this.config;
  }

  isConfigured(): boolean {
    return !!this.config && this.isLocked;
  }

  // 오직 한 번만 호출 가능
  async initializeDatabase(
    setupDto: SetupDatabaseDto,
  ): Promise<{ success: boolean; message: string }> {
    if (this.isLocked || existsSync(this.lockPath)) {
      return {
        success: false,
        message: '🚫 데이터 베이스 설정이 잠겨있어 변경할 수 없습니다.',
      };
    }

    if (existsSync(this.configPath)) {
      return {
        success: false,
        message: '🚫 데이터 베이스 설정 파일이 이미 존재해 변경할 수 없습니다.',
      };
    }

    const configWithMeta: DatabaseConfig = {
      ...setupDto,
      readonly: true as const,
      createdAt: new Date().toISOString(),
      hash: '',
    } as DatabaseConfig;

    // 해시 계산 (hash 제외한 나머지 필드로)
    const { hash, ...configForHash } = configWithMeta;
    configWithMeta.hash = this.calculateHash(configForHash);

    // 연결 테스트
    console.log(`🔍 Testing ${setupDto.type} connection before saving...`);
    const connectionTest = await this.testConnection(configWithMeta);
    if (!connectionTest.success) {
      return {
        success: false,
        message: `데이터 베이스 연결 테스트 실패: ${connectionTest.error}`,
      };
    }

    try {
      // 설정 저장
      this.config = configWithMeta;
      this.saveConfig();

      // 락 파일 생성
      this.createLockFile();

      // 상태 업데이트
      this.isLocked = true;

      console.log(`✅ 데이터 베이스 설정 저장 및 잠김: ${this.config.type}`);
      console.log(`📁 Config file: ${this.configPath}`);
      console.log(`🔒 Lock file: ${this.lockPath}`);

      return {
        success: true,
        message: `데이터 베이스 설정 저장 및 잠김: ${this.config.type}`,
      };
    } catch (error: any) {
      console.error('❌ 데이터 베이스 설정 저장 실패:', error);
      return {
        success: false,
        message: `데이터 베이스 설정 저장 실패: ${error.message}`,
      };
    }
  }

  //TODO 데이터베이스 결정 이후 -> 테이블 생성 및 초기화 로직 추가 

  private saveConfig(): void {
    if (!this.config) {
      throw new Error('No configuration to save');
    }

    try {
      console.log(`💾 데이터 베이스 설정 파일 저장: ${this.configPath}`);
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));

      // 설정 파일이 실제로 생성되었는지 확인
      if (existsSync(this.configPath)) {
        console.log(`✅ 데이터 베이스 설정 파일 저장 완료`);
      } else {
        throw new Error('데이터 베이스 설정 파일이 생성되지 않았습니다.');
      }
    } catch (error: any) {
      console.error('❌ 데이터 베이스 설정 파일 저장 실패:', error);
      throw new Error(`데이터 베이스 설정 파일 저장 실패: ${error.message}`);
    }
  }

  async testConnection(
    config?: DatabaseConfig,
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    const testConfig = config || this.config;
    if (!testConfig) {
      return { success: false, error: '데이터 베이스 설정이 필요합니다.' };
    }

    try {
      console.log(`🔍 ${testConfig.type} 연결 테스트...`);
      const connection = await this.createTestConnection(testConfig);

      // 간단한 SELECT 1 쿼리로 연결 테스트
      const result = await this.executeTestQuery(connection, testConfig.type);

      console.log(`✅ ${testConfig.type} 연결 성공`);
      return {
        success: true,
        details: {
          type: testConfig.type,
          database: testConfig.database,
          host: testConfig.host,
          result,
        },
      };
    } catch (error: any) {
      console.error(`❌ ${testConfig.type} 연결 실패:`, error.message);
      return {
        success: false,
        error: error.message,
        details: {
          type: testConfig.type,
          database: testConfig.database,
          host: testConfig.host,
        },
      };
    }
  }

  private async createTestConnection(config: DatabaseConfig) {
    switch (config.type) {
      case 'sqlite':
        return await this.createSQLiteTestConnection(config);
      case 'postgres':
        return await this.createPostgresTestConnection(config);
      case 'mysql':
        return await this.createMySQLTestConnection(config);
      default:
        throw new Error(`지원하지 않는 데이터베이스 유형: ${config.type}`);
    }
  }

  private async createSQLiteTestConnection(config: DatabaseConfig) {
    try {
      // CommonJS require 방식 사용
      const Database = require('better-sqlite3');
      const { drizzle } = require('drizzle-orm/better-sqlite3');

      const sqlite = new Database(config.database);
      const db = drizzle(sqlite);

      return { drizzle: db, raw: sqlite, type: 'sqlite' };
    } catch (error: any) {
      console.error('SQLite 연결 실패:', error);
      throw new Error(`SQLite 연결 실패: ${error.message}`);
    }
  }

  private async createPostgresTestConnection(config: DatabaseConfig) {
    try {
      const postgres = require('postgres');
      const { drizzle } = require('drizzle-orm/postgres-js');

      const sql = postgres({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
      });

      const db = drizzle(sql);
      return { drizzle: db, raw: sql, type: 'postgres' };
    } catch (error: any) {
      console.error('PostgreSQL 연결 실패:', error);
      throw new Error(`PostgreSQL 연결 실패: ${error.message}`);
    }
  }

  private async createMySQLTestConnection(config: DatabaseConfig) {
    try {
      const mysql = require('mysql2/promise');
      const { drizzle } = require('drizzle-orm/mysql2');

      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl,
      });

      const db = drizzle(connection);
      return { drizzle: db, raw: connection, type: 'mysql' };
    } catch (error: any) {
      console.error('MySQL 연결 실패:', error);
      throw new Error(`MySQL 연결 실패: ${error.message}`);
    }
  }

  private async executeTestQuery(connection: any, dbType: string) {
    switch (dbType) {
      case 'sqlite':
        return connection.raw.prepare('SELECT 1 as test').get();
      case 'postgres':
        const pgResult = await connection.raw`SELECT 1 as test`;
        return pgResult[0];
      case 'mysql':
        const [mysqlRows] = await connection.raw.execute('SELECT 1 as test');
        return mysqlRows[0];
      default:
        throw new Error(`Unknown database type: ${dbType}`);
    }
  }

  // 설정 변경 시도 시 에러 반환
  updateConfig(): never {
    throw new Error('🚫 데이터 베이스 설정은 변경할 수 없습니다.');
  }

  // 설정 상태 조회
  getSetupStatus() {
    return {
      configured: this.isConfigured(),
      locked: this.isLocked,
      type: this.config?.type || null,
      createdAt: this.config?.createdAt || null,
      configExists: existsSync(this.configPath),
      lockExists: existsSync(this.lockPath),
    };
  }
}
