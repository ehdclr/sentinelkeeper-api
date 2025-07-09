// 기본 설정 인터페이스
export interface BaseDatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  database: string;
  readonly: true;
  createdAt: string;
  hash: string;
}

// SQLite 전용 설정
export interface SQLiteConfig extends BaseDatabaseConfig {
  type: 'sqlite';
}

// PostgreSQL/MySQL 공통 설정
export interface PostgresConfig extends BaseDatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  ssl?: boolean;
}

// MySQL 전용 설정
export interface MySQLConfig extends BaseDatabaseConfig {
  type: 'mysql';
  host: string;
  port: number;
  username: string;
  password: string;
  ssl?: boolean;
}

// 통합 설정 타입
export type DatabaseConfig = SQLiteConfig | PostgresConfig | MySQLConfig;

// 타입 가드 함수들
export function isSQLiteConfig(config: DatabaseConfig): config is SQLiteConfig {
  return config.type === 'sqlite';
}

export function isPostgresConfig(
  config: DatabaseConfig,
): config is PostgresConfig {
  return config.type === 'postgres';
}

export function isMySQLConfig(config: DatabaseConfig): config is MySQLConfig {
  return config.type === 'mysql';
}
