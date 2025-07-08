import { defineConfig } from 'drizzle-kit';
import { existsSync, readFileSync } from 'fs';

const CONFIG_FILE = './database-config.json';
const LOCK_FILE = './.database-lock';

let dbType: 'sqlite' | 'postgresql' | 'mysql' = 'sqlite'; // 기본값
let dbCredentials: any = {
  url: './data/sentinel.db',
};

if (existsSync(CONFIG_FILE) && existsSync(LOCK_FILE)) {
  try {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    const configType = config.type || 'sqlite';

    // postgres -> postgresql로 변환
    dbType = configType === 'postgres' ? 'postgresql' : configType;

    // 데이터베이스 타입별 설정
    switch (dbType) {
      case 'postgresql':
        dbCredentials = {
          host: config.host || 'localhost',
          port: config.port || 5432,
          user: config.username,
          password: config.password,
          database: config.database,
        };
        break;
      case 'mysql':
        dbCredentials = {
          host: config.host || 'localhost',
          port: config.port || 3306,
          user: config.username,
          password: config.password,
          database: config.database,
        };
        break;
      case 'sqlite':
        dbCredentials = {
          url: config.database || './data/sentinel.db',
        };
        break;
      default:
        throw new Error(`지원되지 않는 데이터베이스 유형: ${dbType}`);
    }
  } catch (error) {
    console.warn(
      '⚠️ 설정 파일 읽기 실패, 기본값 사용:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export default defineConfig({
  schema: `./src/database/migrations/${dbType}.schema.ts`,
  out: './drizzle',
  dialect: dbType,
  dbCredentials,
});
