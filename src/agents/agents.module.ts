import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '@/database/database.module';
import { CommonModule } from '@/common/common.module';

@Module({
  imports: [CqrsModule, DatabaseModule, CommonModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class AgentsModule {}
