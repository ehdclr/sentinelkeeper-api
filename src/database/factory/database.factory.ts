import { Injectable } from '@nestjs/common';
import { DatabaseConfig } from '../config/database-config.interface';
import { DatabaseConfigService } from '../config/database-config.service';

@Injectable()
export class DatabaseFactory {
  constructor(private configService: DatabaseConfigService) {}

  async createDatabaseConnection() {
    const config = this.configService.getConfig();

    switch (config.type) {
      case 'sqlite':
        return this.createSQLiteConnection(config);
      case 'postgres':
        return this.createPostgresConnection(config);
      case 'mysql':
        return this.createMySQLConnection(config);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  private async createSQLiteConnection(config: DatabaseConfig) {
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const Database = await import('better-sqlite3');
    const sqlite = new Database.default(config.database);
    return drizzle(sqlite);
  }

  private async createPostgresConnection(config: DatabaseConfig) {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = await import('postgres');
    const sql = postgres.default({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
    });
    return drizzle(sql);
  }

  private async createMySQLConnection(config: DatabaseConfig) {
    const { drizzle } = await import('drizzle-orm/mysql2');
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      // ssl: config.ssl,
    });
    return drizzle(connection);
  }
}
