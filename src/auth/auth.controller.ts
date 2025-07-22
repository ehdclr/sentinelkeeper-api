import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { QueryBus } from '@nestjs/cqrs';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}
}
