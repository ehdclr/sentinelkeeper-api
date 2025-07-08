import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { DatabaseConfig } from './database-config.interface';
import { SetupDatabaseDto } from '../../setup/dto/setup-database.dto';
import { execSync } from 'child_process';

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

      // 스키마 초기화
      await this.initializeDatabaseSchema();

      console.log(
        `✅ 데이터 베이스 설정 및 스키마 초기화 완료: ${this.config.type}`,
      );
      console.log(`📁 Config file: ${this.configPath}`);
      console.log(`🔒 Lock file: ${this.lockPath}`);

      return {
        success: true,
        message: `데이터 베이스 설정 및 스키마 초기화 완료: ${this.config.type}`,
      };
    } catch (error: any) {
      console.error('❌ 데이터 베이스 설정 저장 실패:', error);
      return {
        success: false,
        message: `데이터 베이스 설정 저장 실패: ${error.message}`,
      };
    }
  }

  // 스키마 초기화 메인 로직
  async initializeDatabaseSchema(): Promise<void> {
    if (!this.config) {
      throw new Error('데이터베이스 설정이 필요합니다.');
    }

    try {
      console.log(`🏗️ ${this.config.type} 스키마 초기화 시작...`);

      // 1. Drizzle Kit 시도
      const drizzleSuccess = await this.tryDrizzleKitMigration();

      if (!drizzleSuccess) {
        // 2. 수동 테이블 생성
        await this.createTablesDirectly();
      }

      // 3. 초기 데이터 설정
      await this.setupInitialData();

      console.log(`✅ ${this.config.type} 스키마 초기화 완료`);
    } catch (error: any) {
      console.error(`❌ 스키마 초기화 실패:`, error);
      throw new Error(`스키마 초기화 실패: ${error.message}`);
    }
  }

  // Drizzle Kit 마이그레이션 시도
  private async tryDrizzleKitMigration(): Promise<boolean> {
    try {
      console.log('📦 Drizzle Kit 마이그레이션 시도 중...');

      // 마이그레이션 파일 생성
      execSync('npx drizzle-kit generate', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 30000,
      });

      // 마이그레이션 적용
      execSync('npx drizzle-kit migrate', {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 30000,
      });

      console.log('✅ Drizzle Kit 마이그레이션 성공');
      return true;
    } catch (error: any) {
      console.warn(
        '⚠️ Drizzle Kit 마이그레이션 실패, 수동 방식으로 전환...',
        error.message,
      );
      return false;
    }
  }

  // 각 DB별 직접 테이블 생성
  private async createTablesDirectly(): Promise<void> {
    console.log('🔧 수동 테이블 생성 시작...');

    try {
      switch (this.config!.type) {
        case 'sqlite':
          await this.createSQLiteTables();
          break;
        case 'postgres':
          await this.createPostgresTables();
          break;
        case 'mysql':
          await this.createMySQLTables();
          break;
        default:
          throw new Error(
            `지원하지 않는 데이터베이스 유형: ${this.config!.type}`,
          );
      }

      console.log('✅ 수동 테이블 생성 완료');
    } catch (error: any) {
      console.error('❌ 수동 테이블 생성 실패:', error);
      throw error;
    }
  }

  // SQLite 테이블 생성
  private async createSQLiteTables(): Promise<void> {
    const Database = require('better-sqlite3');
    const sqlite = new Database(this.config!.database);

    try {
      const queries = [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT UNIQUE,
          is_active INTEGER DEFAULT 1,
          is_system_admin INTEGER DEFAULT 0,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )`,
        `CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS user_roles (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, role_id)
        )`,
        `CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )`,
      ];

      for (const query of queries) {
        sqlite.exec(query);
      }

      console.log('✅ SQLite 테이블 생성 완료');
    } finally {
      sqlite.close();
    }
  }

  // PostgreSQL 테이블 생성
  private async createPostgresTables(): Promise<void> {
    const postgres = require('postgres');

    const sql = postgres({
      host: this.config!.host,
      port: this.config!.port,
      username: this.config!.username,
      password: this.config!.password,
      database: this.config!.database,
      ssl: this.config!.ssl,
    });

    try {
      const queries = [
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          is_active BOOLEAN DEFAULT TRUE,
          is_system_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          description VARCHAR(255)
        )`,
        `CREATE TABLE IF NOT EXISTS user_roles (
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, role_id)
        )`,
        `CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT
        )`,
      ];

      for (const query of queries) {
        await sql.unsafe(query); // postgres 라이브러리의 unsafe 메서드 사용
      }

      console.log('✅ PostgreSQL 테이블 생성 완료');
    } finally {
      await sql.end();
    }
  }

  // MySQL 테이블 생성
  private async createMySQLTables(): Promise<void> {
    const mysql = require('mysql2/promise');

    const connection = await mysql.createConnection({
      host: this.config!.host,
      port: this.config!.port,
      user: this.config!.username,
      password: this.config!.password,
      database: this.config!.database,
      ssl: this.config!.ssl,
    });

    try {
      const queries = [
        `CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          is_active TINYINT(1) DEFAULT 1,
          is_system_admin TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS roles (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(50) NOT NULL UNIQUE,
          description VARCHAR(255)
        )`,
        `CREATE TABLE IF NOT EXISTS user_roles (
          user_id INT,
          role_id INT,
          PRIMARY KEY (user_id, role_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT
        )`,
      ];

      for (const query of queries) {
        await connection.execute(query);
      }

      console.log('✅ MySQL 테이블 생성 완료');
    } finally {
      await connection.end();
    }
  }

  // 초기 데이터 설정
  private async setupInitialData(): Promise<void> {
    try {
      console.log('📝 초기 데이터 설정 중...');

      switch (this.config!.type) {
        case 'sqlite':
          await this.setupSQLiteInitialData();
          break;
        case 'postgres':
          await this.setupPostgresInitialData();
          break;
        case 'mysql':
          await this.setupMySQLInitialData();
          break;
      }

      console.log('✅ 초기 데이터 설정 완료');
    } catch (error: any) {
      console.warn('⚠️ 초기 데이터 설정 중 오류 (무시):', error.message);
    }
  }

  // SQLite 초기 데이터
  private async setupSQLiteInitialData(): Promise<void> {
    const Database = require('better-sqlite3');
    const sqlite = new Database(this.config!.database);

    try {
      // 역할 확인
      const roleCount = sqlite
        .prepare('SELECT COUNT(*) as count FROM roles')
        .get();

      if (roleCount.count === 0) {
        sqlite
          .prepare('INSERT INTO roles (name, description) VALUES (?, ?)')
          .run('admin', '시스템 관리자');
        sqlite
          .prepare('INSERT INTO roles (name, description) VALUES (?, ?)')
          .run('user', '일반 사용자');
      }

      // 시스템 설정
      const appName = 'Sentinel';
      const version = '1.0.0';
      const initializedAt = new Date().toISOString();

      sqlite
        .prepare(
          'INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)',
        )
        .run('app_name', appName);
      sqlite
        .prepare(
          'INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)',
        )
        .run('version', version);
      sqlite
        .prepare(
          'INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)',
        )
        .run('initialized_at', initializedAt);
    } finally {
      sqlite.close();
    }
  }

  // PostgreSQL 초기 데이터
  private async setupPostgresInitialData(): Promise<void> {
    const postgres = require('postgres');
    const sql = postgres({
      host: this.config!.host,
      port: this.config!.port,
      username: this.config!.username,
      password: this.config!.password,
      database: this.config!.database,
      ssl: this.config!.ssl,
    });

    try {
      // 역할 확인
      const roleResult = await sql`SELECT COUNT(*) as count FROM roles`;

      if (parseInt(roleResult[0].count) === 0) {
        await sql`INSERT INTO roles (name, description) VALUES ('admin', '시스템 관리자')`;
        await sql`INSERT INTO roles (name, description) VALUES ('user', '일반 사용자')`;
      }

      // 시스템 설정
      const appName = 'Sentinel';
      const version = '1.0.0';
      const initializedAt = new Date().toISOString();

      await sql`INSERT INTO system_settings (key, value) VALUES ('app_name', ${appName}) ON CONFLICT (key) DO UPDATE SET value = ${appName}`;
      await sql`INSERT INTO system_settings (key, value) VALUES ('version', ${version}) ON CONFLICT (key) DO UPDATE SET value = ${version}`;
      await sql`INSERT INTO system_settings (key, value) VALUES ('initialized_at', ${initializedAt}) ON CONFLICT (key) DO UPDATE SET value = ${initializedAt}`;
    } finally {
      await sql.end();
    }
  }

  // MySQL 초기 데이터
  private async setupMySQLInitialData(): Promise<void> {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: this.config!.host,
      port: this.config!.port,
      user: this.config!.username,
      password: this.config!.password,
      database: this.config!.database,
      ssl: this.config!.ssl,
    });

    try {
      // 역할 확인
      const [roleRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM roles',
      );

      if (roleRows[0].count === 0) {
        await connection.execute(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
          ['admin', '시스템 관리자'],
        );
        await connection.execute(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
          ['user', '일반 사용자'],
        );
      }

      // 시스템 설정
      const appName = 'Sentinel';
      const version = '1.0.0';
      const initializedAt = new Date().toISOString();

      await connection.execute(
        'INSERT INTO system_settings (key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['app_name', appName],
      );
      await connection.execute(
        'INSERT INTO system_settings (key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['version', version],
      );
      await connection.execute(
        'INSERT INTO system_settings (key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['initialized_at', initializedAt],
      );
    } finally {
      await connection.end();
    }
  }

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
