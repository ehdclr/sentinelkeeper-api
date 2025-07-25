import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './repositories/auth.repository';
import { SessionGuard } from './guards/session.guard';

// Command Handlers
import { LoginUserHandler } from './handlers/login-user.handler';
import { ValidateSessionHandler } from './handlers/validate-session.handler';
import { RevokeSessionHandler } from './handlers/revoke-session.handler';

// Event Handlers
import { UserLoggedInHandler } from './handlers/user-logged-in.handler';

const CommandHandlers = [
  LoginUserHandler,
  ValidateSessionHandler,
  RevokeSessionHandler,
];

const EventHandlers = [UserLoggedInHandler];

@Module({
  imports: [CqrsModule, UsersModule],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    SessionGuard,
    ...CommandHandlers,
    ...EventHandlers,
  ],
  exports: [AuthRepository, SessionGuard],
})
export class AuthModule {}
