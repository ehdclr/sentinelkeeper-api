import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { UserHashService } from './user-hash.service';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserDomainService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userHashService: UserHashService,
  ) {}

  async createRootUser(data: {
    username: string;
    password: string;
    email?: string;
  }) {
    // 도메인 규칙 검증
    const existingUser = await this.userRepository.findByUsername(
      data.username,
    );
    if (existingUser) {
      throw new Error(`사용자명 '${data.username}'은 이미 존재합니다.`);
    }

    // 비밀번호 해싱
    const passwordHash = await this.userHashService.hashPassword(data.password);

    // 엔티티 생성
    const userData = UserEntity.create({
      username: data.username,
      passwordHash,
      email: data.email,
      isSystemAdmin: true,
    });

    // 저장
    return await this.userRepository.create(userData);
  }

  async verifyPassword(username: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) return false;

    return this.userHashService.comparePassword(password, user.passwordHash);
  }
}
