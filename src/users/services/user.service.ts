import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { BcryptHashService } from '@/common/services/hash.service';
import { PemKeyService } from '@/common/services/pem-key.service';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: BcryptHashService,
    private readonly pemKeyService: PemKeyService,
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

      const { pemKey, recoveryKeyId, encryptedRecoveryData } =
        await this.pemKeyService.generateRootPemKey(data.username, data.email);

      const passwordHash = await this.hashService.hash(data.password);

      const userData = UserEntity.create({
        username: data.username,
        password: passwordHash,
        email: data.email,
        isSystemRoot: true,
        recoveryKeyId,
        encryptedRecoveryData,
      });

      // 저장 - 타입 단언으로 해결
      const user = await this.userRepository.create(userData as any);
      return {
        user,
        pemKey,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resetPasswordWithPemKey(
    pemContent: string,
    newPassword: string,
  ): Promise<{
    username: string;
    message: string;
  }> {
    try {
      // 1. PEM 키 파싱
      const { keyId, masterKey } = this.pemKeyService.parsePemKey(pemContent);

      // 2. DB에서 사용자 조회
      const user = await this.userRepository.findByRecoveryKeyId(keyId);
      if (!user || !user.encryptedRecoveryData) {
        throw new NotFoundException('복구 키를 찾을 수 없습니다.');
      }

      // 3. 복구 데이터 복호화
      const recoveryData = await this.pemKeyService.decryptRecoveryData(
        user.encryptedRecoveryData,
        masterKey,
      );

      // 4. 비밀번호 변경
      const hashedPassword = await this.hashService.hash(newPassword);
      await this.userRepository.updatePassword(user.id, hashedPassword);

      return {
        username: recoveryData.username,
        message: '비밀번호가 성공적으로 변경되었습니다.',
      };
    } catch (error) {
      this.logger.error('비밀번호 리셋 실패:', error);
      throw error;
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
