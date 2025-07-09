// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { DatabaseConfigService } from './services/database-config.service';
import { ConfigManagerService } from './services/config-manager.service';
import { ConnectionManagerService } from './services/connection-manager.service';
import { PostgresStrategy } from './strategies/postgres.strategy';
import { SQLiteStrategy } from './strategies/sqlite.strategy';
import { MySQLStrategy } from './strategies/mysql.strategy';

@Module({
  providers: [
    // 전략 패턴 구현체들
    PostgresStrategy,
    SQLiteStrategy,
    MySQLStrategy,

    // 핵심 서비스들
    ConfigManagerService,
    ConnectionManagerService,
    DatabaseConfigService,
  ],
  exports: [
    DatabaseConfigService,
    ConnectionManagerService, // 다른 모듈에서 직접 연결 관리가 필요한 경우
  ],
})
export class DatabaseModule {}
