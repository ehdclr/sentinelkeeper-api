import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { CheckRootUserExistsQuery } from '../queries/check-root-user-exists.query';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
@QueryHandler(CheckRootUserExistsQuery)
export class CheckRootUserExistsHandler
  implements IQueryHandler<CheckRootUserExistsQuery>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<{ exists: boolean; count: number }> {
    const count = await this.userRepository.countSystemAdmins();
    return {
      exists: count > 0,
      count,
    };
  }
}
