import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { CreateRootUserCommand } from '../commands/create-root-user.command';
import { UserService } from '../services/user.service';

@Injectable()
@CommandHandler(CreateRootUserCommand)
export class CreateRootUserHandler
  implements ICommandHandler<CreateRootUserCommand>
{
  constructor(private readonly userService: UserService) {}

  async execute(
    command: CreateRootUserCommand,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { username, password, email } = command;

      // 루트 사용자 생성 (UserService 내부에서 비밀번호 해싱 처리)
      const user = await this.userService.createUser({
        username,
        password, // 원본 비밀번호 전달
        email,
        isSystemAdmin: true,
      });

      return {
        success: true,
        message: `루트 사용자 '${username}' 생성 완료`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `루트 사용자 생성 실패: ${error.message}`,
      };
    }
  }
}
