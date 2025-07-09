// src/database/strategies/sqlite.strategy.ts
import { Injectable } from '@nestjs/common';
import { DatabaseStrategy } from './database-strategy.abstract';
import {
  DatabaseConfig,
  DatabasePool,
  ConnectionTestResult,
} from '../types/database.type';
import {
  SQL_QUERIES,
  REQUIRED_TABLES,
  DEFAULT_ROLES,
  SYSTEM_SETTINGS,
} from '../constants/database.constant';

@Injectable()
export class SQLiteStrategy extends DatabaseStrategy {
  get type(): 'sqlite' {
    return 'sqlite';
  }

  async createConnection(config: DatabaseConfig): Promise<DatabasePool> {
    if (config.type !== 'sqlite') {
      throw new Error('Invalid config type for SQLiteStrategy');
    }

    try {
      // CommonJS require 방식 사용
      const Database = require('better-sqlite3');
      const { drizzle } = require('drizzle-orm/better-sqlite3');

      const sqlite = new Database(config.database);
      const drizzleDb = drizzle(sqlite);

      const pool: DatabasePool = {
        connection: sqlite,
        drizzle: drizzleDb,
        isHealthy: true,
        lastUsed: new Date(),
        type: 'sqlite',
      };

      this.logger.log('SQLite connection created successfully');
      return pool;
    } catch (error) {
      this.logger.error('Failed to create SQLite connection', error);
      throw this.wrapConnectionError(error as Error);
    }
  }

  async testConnection(config: DatabaseConfig): Promise<ConnectionTestResult> {
    if (config.type !== 'sqlite') {
      return {
        success: false,
        error: 'Invalid config type for SQLiteStrategy',
      };
    }

    try {
      const pool = await this.createConnection(config);

      const result = pool.connection
        .prepare(SQL_QUERIES.SQLITE.TEST_QUERY)
        .get();
      await this.cleanup(pool);

      this.logger.log('SQLite connection test successful');
      return {
        success: true,
        details: {
          type: 'sqlite',
          database: config.database,
          result,
        },
      };
    } catch (error) {
      this.logger.error('SQLite connection test failed', error);
      return {
        success: false,
        error: (error as Error).message,
        details: {
          type: 'sqlite',
          database: config.database,
        },
      };
    }
  }

  async createTables(pool: DatabasePool): Promise<void> {
    try {
      const queries = [
        SQL_QUERIES.SQLITE.CREATE_USERS,
        SQL_QUERIES.SQLITE.CREATE_ROLES,
        SQL_QUERIES.SQLITE.CREATE_USER_ROLES,
        SQL_QUERIES.SQLITE.CREATE_SYSTEM_SETTINGS,
      ];

      for (const query of queries) {
        pool.connection.exec(query);
      }

      this.logger.log('SQLite tables created successfully');
    } catch (error) {
      this.logger.error('Failed to create SQLite tables', error);
      throw this.wrapSchemaError('table creation', error as Error);
    }
  }

  async checkTablesExist(pool: DatabasePool): Promise<boolean> {
    try {
      for (const table of REQUIRED_TABLES) {
        const result = pool.connection
          .prepare(SQL_QUERIES.SQLITE.CHECK_TABLE)
          .get(table);

        if (!result) {
          this.logger.warn(`Table '${table}' does not exist`);
          return false;
        }
      }

      this.logger.log('All required SQLite tables exist');
      return true;
    } catch (error) {
      this.logger.warn('Failed to check SQLite table existence', error);
      return false;
    }
  }

  async setupInitialData(pool: DatabasePool): Promise<void> {
    try {
      // 역할 데이터 확인 및 삽입
      const roleCount = pool.connection
        .prepare('SELECT COUNT(*) as count FROM roles')
        .get() as { count: number };

      if (roleCount.count === 0) {
        const insertRole = pool.connection.prepare(
          'INSERT INTO roles (name, description) VALUES (?, ?)',
        );

        for (const role of DEFAULT_ROLES) {
          insertRole.run(role.name, role.description);
        }
        this.logger.log('Default roles inserted');
      }

      // 시스템 설정
      const initializedAt = new Date().toISOString();
      const settings = [
        { key: 'app_name', value: SYSTEM_SETTINGS.APP_NAME },
        { key: 'version', value: SYSTEM_SETTINGS.VERSION },
        { key: 'initialized_at', value: initializedAt },
      ];

      const insertSetting = pool.connection.prepare(
        'INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)',
      );

      for (const setting of settings) {
        insertSetting.run(setting.key, setting.value);
      }

      this.logger.log('SQLite initial data setup completed');
    } catch (error) {
      this.logger.warn('Failed to setup SQLite initial data', error);
      throw this.wrapSchemaError('initial data setup', error as Error);
    }
  }

  async cleanup(pool: DatabasePool): Promise<void> {
    try {
      if (pool.connection && typeof pool.connection.close === 'function') {
        pool.connection.close();
        this.logger.log('SQLite connection cleaned up');
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup SQLite connection', error);
    }
  }

  async healthCheck(pool: DatabasePool): Promise<boolean> {
    try {
      pool.connection.prepare('SELECT 1').get();
      pool.isHealthy = true;
      pool.lastUsed = new Date();
      return true;
    } catch (error) {
      this.logger.warn('SQLite health check failed', error);
      pool.isHealthy = false;
      return false;
    }
  }
}
