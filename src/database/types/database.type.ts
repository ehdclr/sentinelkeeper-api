// src/database/types/database.types.ts
import { z } from 'zod';

// 기본 설정 스키마
const BaseConfigSchema = z.object({
  readonly: z.literal(true),
  createdAt: z.string(),
  hash: z.string(),
});

// PostgreSQL 설정 스키마
const PostgresConfigSchema = BaseConfigSchema.extend({
  type: z.literal('postgres'),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string(),
  database: z.string().min(1),
  ssl: z.boolean().optional().default(false),
});

// MySQL 설정 스키마
const MySQLConfigSchema = BaseConfigSchema.extend({
  type: z.literal('mysql'),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string(),
  database: z.string().min(1),
  ssl: z.boolean().optional().default(false),
});

// SQLite 설정 스키마
const SQLiteConfigSchema = BaseConfigSchema.extend({
  type: z.literal('sqlite'),
  database: z.string().min(1),
});

// 전체 설정 스키마
export const DatabaseConfigSchema = z.discriminatedUnion('type', [
  PostgresConfigSchema,
  MySQLConfigSchema,
  SQLiteConfigSchema,
]);

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type PostgresConfig = z.infer<typeof PostgresConfigSchema>;
export type MySQLConfig = z.infer<typeof MySQLConfigSchema>;
export type SQLiteConfig = z.infer<typeof SQLiteConfigSchema>;

// 타입 가드 함수들
export function isPostgresConfig(
  config: DatabaseConfig,
): config is PostgresConfig {
  return config.type === 'postgres';
}

export function isMySQLConfig(config: DatabaseConfig): config is MySQLConfig {
  return config.type === 'mysql';
}

export function isSQLiteConfig(config: DatabaseConfig): config is SQLiteConfig {
  return config.type === 'sqlite';
}

// 설정 DTO 스키마 (hash, readonly, createdAt 제외)
export const SetupDatabaseDtoSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('postgres'),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1),
    password: z.string(),
    database: z.string().min(1),
    ssl: z.boolean().optional().default(false),
  }),
  z.object({
    type: z.literal('mysql'),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    username: z.string().min(1),
    password: z.string(),
    database: z.string().min(1),
    ssl: z.boolean().optional().default(false),
  }),
  z.object({
    type: z.literal('sqlite'),
    database: z.string().min(1),
  }),
]);

export type SetupDatabaseDto = z.infer<typeof SetupDatabaseDtoSchema>;

// 연결 풀 인터페이스
export interface DatabasePool {
  connection: any;
  drizzle: any;
  isHealthy: boolean;
  lastUsed: Date;
  type: DatabaseConfig['type'];
}

// 연결 테스트 결과
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  details?: {
    type: DatabaseConfig['type'];
    database: string;
    host?: string;
    result?: any;
  };
}

// 설정 상태
export interface SetupStatus {
  configured: boolean;
  locked: boolean;
  type: DatabaseConfig['type'] | null;
  createdAt: string | null;
  configExists: boolean;
  lockExists: boolean;
}

// 초기화 결과
export interface InitializationResult {
  success: boolean;
  message: string;
}

// 커스텀 에러 클래스들
export class DatabaseConnectionError extends Error {
  constructor(
    public readonly dbType: string,
    public readonly originalError: Error,
  ) {
    super(`${dbType} connection failed: ${originalError.message}`);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseSchemaError extends Error {
  constructor(
    public readonly operation: string,
    public readonly originalError: Error,
  ) {
    super(`Schema ${operation} failed: ${originalError.message}`);
    this.name = 'DatabaseSchemaError';
  }
}

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigurationError';
  }
}

export class DatabaseLockError extends Error {
  constructor(message: string = '데이터베이스 설정이 잠겨있습니다.') {
    super(message);
    this.name = 'DatabaseLockError';
  }
}
