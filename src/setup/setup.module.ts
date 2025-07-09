import { Module } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [SetupController],
})
export class SetupModule {}
