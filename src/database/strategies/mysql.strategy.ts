// src/database/strategies/mysql.strategy.ts
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
export class MySQLStrategy extends DatabaseStrategy {
  get type(): 'mysql' {
    return 'mysql';
  }

  async createConnection(config: DatabaseConfig): Promise<DatabasePool> {
    if (config.type !== 'mysql') {
      throw new Error('Invalid config type for MySQLStrategy');
    }

    try {
      // CommonJS require 방식 사용
      const mysql = require('mysql2/promise');
      const { drizzle } = require('drizzle-orm/mysql2');

      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        charset: 'utf8mb4',
      });

      const drizzleDb = drizzle(connection);

      const pool: DatabasePool = {
        connection,
        drizzle: drizzleDb,
        isHealthy: true,
        lastUsed: new Date(),
        type: 'mysql',
      };

      this.logger.log('MySQL connection created successfully');
      return pool;
    } catch (error) {
      this.logger.error('Failed to create MySQL connection', error);
      throw this.wrapConnectionError(error as Error);
    }
  }

  async testConnection(config: DatabaseConfig): Promise<ConnectionTestResult> {
    if (config.type !== 'mysql') {
      throw new Error('Invalid config type for MySQLStrategy');
    }

    try {
      const pool = await this.createConnection(config);

      const [rows] = await pool.connection.execute(
        SQL_QUERIES.MYSQL.TEST_QUERY,
      );
      await this.cleanup(pool);

      this.logger.log('MySQL connection test successful');
      return {
        success: true,
        details: {
          type: 'mysql',
          database: config.database,
          host: config.host,
          result: (rows as any[])[0],
        },
      };
    } catch (error) {
      this.logger.error('MySQL connection test failed', error);
      return {
        success: false,
        error: (error as Error).message,
        details: {
          type: 'mysql',
          database: config.database,
          host: config.host,
        },
      };
    }
  }

  async checkTablesExist(pool: DatabasePool): Promise<boolean> {
    try {
      const databaseName = (pool.connection as any).config.database;

      for (const table of REQUIRED_TABLES) {
        const [rows] = await pool.connection.execute(
          SQL_QUERIES.MYSQL.CHECK_TABLE,
          [databaseName, table],
        );

        if ((rows as any[]).length === 0) {
          this.logger.warn(`Table '${table}' does not exist`);
          return false;
        }
      }

      this.logger.log('All required MySQL tables exist');
      return true;
    } catch (error) {
      this.logger.warn('Failed to check MySQL table existence', error);
      return false;
    }
  }

  async createTables(pool: DatabasePool): Promise<void> {
    try {
      const queries = [
        SQL_QUERIES.MYSQL.CREATE_USERS,
        SQL_QUERIES.MYSQL.CREATE_ROLES,
        SQL_QUERIES.MYSQL.CREATE_USER_ROLES,
        SQL_QUERIES.MYSQL.CREATE_SYSTEM_SETTINGS,
      ];

      for (const query of queries) {
        await pool.connection.execute(query);
      }

      this.logger.log('MySQL tables created successfully');
    } catch (error) {
      this.logger.error('Failed to create MySQL tables', error);
      throw this.wrapSchemaError('table creation', error as Error);
    }
  }

  async setupInitialData(pool: DatabasePool): Promise<void> {
    try {
      // 역할 데이터 확인 및 삽입
      const [roleRows] = await pool.connection.execute(
        'SELECT COUNT(*) as count FROM roles',
      );

      if ((roleRows as any[])[0].count === 0) {
        for (const role of DEFAULT_ROLES) {
          await pool.connection.execute(
            'INSERT INTO roles (name, description) VALUES (?, ?)',
            [role.name, role.description],
          );
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

      for (const setting of settings) {
        await pool.connection.execute(
          'INSERT INTO system_settings (key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
          [setting.key, setting.value],
        );
      }

      this.logger.log('MySQL initial data setup completed');
    } catch (error) {
      this.logger.warn('Failed to setup MySQL initial data', error);
      throw this.wrapSchemaError('initial data setup', error as Error);
    }
  }

  async cleanup(pool: DatabasePool): Promise<void> {
    try {
      if (pool.connection && typeof pool.connection.end === 'function') {
        await pool.connection.end();
        this.logger.log('MySQL connection cleaned up');
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup MySQL connection', error);
    }
  }

  async healthCheck(pool: DatabasePool): Promise<boolean> {
    try {
      await pool.connection.execute('SELECT 1');
      pool.isHealthy = true;
      pool.lastUsed = new Date();
      return true;
    } catch (error) {
      this.logger.warn('MySQL health check failed', error);
      pool.isHealthy = false;
      return false;
    }
  }
}
