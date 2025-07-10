import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { BcryptHashService } from '@/common/services/hash.service';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: BcryptHashService,
  ) {}

  async createRootUser(data: {
    username: string;
    password: string;
    email?: string;
  }) {
    try {
      const existingUser = await this.userRepository.findByUsername(
        data.username,
      );

      if (existingUser) {
        throw new ConflictException('시스템 관리자 계정이 이미 존재합니다.');
      }

      const passwordHash = await this.hashService.hash(data.password);

      const userData = UserEntity.create({
        username: data.username,
        password: passwordHash,
        email: data.email,
        isSystemAdmin: true,
      });

      // 저장 - 타입 단언으로 해결
      return await this.userRepository.create(userData as any);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async verifyPassword(username: string, password: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByUsername(username);
      if (!user) return false;
      return this.hashService.compare(password, user.password);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async checkRootUserExists(): Promise<boolean> {
    try {
      const user = await this.userRepository.findByUsername('root');
      if (!user || !user.isSystemAdmin) {
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
