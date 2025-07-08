import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { CheckRootUserExistsQuery } from '../queries/check-root-user-exists.query';
import { UserService } from '../services/user.service';

@Injectable()
@QueryHandler(CheckRootUserExistsQuery)
export class CheckRootUserExistsHandler
  implements IQueryHandler<CheckRootUserExistsQuery>
{
  constructor(private readonly userService: UserService) {}

  async execute(): Promise<{ exists: boolean; count: number }> {
    const count = await this.userService.countSystemAdmins();
    return {
      exists: count > 0,
      count,
    };
  }
}
