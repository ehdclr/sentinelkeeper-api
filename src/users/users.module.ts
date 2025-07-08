import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserDomainService } from './services/user-domain.service';
import { UserHashService } from './services/user-hash.service';
import { UserRepository } from './repositories/user.repository';
import { CreateRootUserHandler } from './handlers/create-root-user.handler';
import { CheckRootUserExistsHandler } from './handlers/check-root-user-exists.handler';
import { UserCreatedHandler } from './events/user-created.handler';

const CommandHandlers = [CreateRootUserHandler];
const QueryHandlers = [CheckRootUserExistsHandler];
const EventHandlers = [UserCreatedHandler];

@Module({
  imports: [CqrsModule],
  providers: [
    UserDomainService,
    UserHashService,
    UserRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [UserDomainService, UserHashService, UserRepository],
})
export class UsersModule {}
