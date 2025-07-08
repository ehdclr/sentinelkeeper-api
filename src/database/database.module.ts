import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { DatabaseConfigService } from './config/database-config.service';
import { DatabaseFactory } from './factory/database.factory';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const databaseProvider: Provider = {
      provide: DATABASE_CONNECTION,
      useFactory: async (
        configService: DatabaseConfigService,
        factory: DatabaseFactory,
      ) => {
        // 설정이 없는 경우에는 null 반환 (setup 단계에서는 연결 불필요)
        if (!configService.isConfigured()) {
          return null;
        }
        return await factory.createDatabaseConnection();
      },
      inject: [DatabaseConfigService, DatabaseFactory],
    };

    return {
      module: DatabaseModule,
      providers: [DatabaseConfigService, DatabaseFactory, databaseProvider],
      exports: [DATABASE_CONNECTION, DatabaseConfigService],
    };
  }
}
