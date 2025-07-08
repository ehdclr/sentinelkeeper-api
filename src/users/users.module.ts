import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserService } from './services/user.service';
import { UserHashService } from './services/user-hash.service';
import { CreateRootUserHandler } from './handlers/create-root-user.handler';
import { CheckRootUserExistsHandler } from './handlers/check-root-user-exists.handler';

const CommandHandlers = [CreateRootUserHandler];
const QueryHandlers = [CheckRootUserExistsHandler];

@Module({
  imports: [CqrsModule],
  providers: [
    UserService,
    UserHashService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [UserService, UserHashService],
})
export class UsersModule {}
