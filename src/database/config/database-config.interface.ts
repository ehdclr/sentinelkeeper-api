export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  ssl?: boolean;
  readonly: true; //한번 설정되면 읽기 전용
  createdAt: string;
  hash: string; //설정 무결성 검증용
}
