import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { UsersController } from './users.controller';
import { UserService } from './services/user.service';
import { UserRepository } from './repositories/user.repository';
import { DatabaseConfigService } from '../database/services/database-config.service';
import { CreateRootUserHandler } from './handlers/create-root-user.handler';
import { CheckRootUserExistsHandler } from './handlers/check-root-user-exists.handler';
import { UserCreatedHandler } from './handlers/user-created.handler';
import { DatabaseModule } from '@/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ConfigManagerService } from '@/database/services/config-manager.service';
import { ConnectionManagerService } from '@/database/services/connection-manager.service';
import { PostgresStrategy } from '@/database/strategies/postgres.strategy';
import { SQLiteStrategy } from '@/database/strategies/sqlite.strategy';
import { MySQLStrategy } from '@/database/strategies/mysql.strategy';

const CommandHandlers = [CreateRootUserHandler];
const QueryHandlers = [CheckRootUserExistsHandler];
const EventHandlers = [UserCreatedHandler];

@Module({
  imports: [CqrsModule, DatabaseModule, ConfigModule],
  controllers: [UsersController],
  providers: [
    UserService,
    UserRepository,
    DatabaseConfigService,
    ConfigManagerService,
    ConnectionManagerService,
    PostgresStrategy,
    SQLiteStrategy,
    MySQLStrategy,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [UserService, UserRepository],
})
export class UsersModule {}
