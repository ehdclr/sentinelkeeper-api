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

      // Ed25519 키쌍 생성
      const { publicKey, privateKeyPem } =
        await this.pemKeyService.generateEd25519RootKeyPair(
          data.username,
          data.email,
        );

      const passwordHash = await this.hashService.hash(data.password);

      const userData = UserEntity.create({
        username: data.username,
        password: passwordHash,
        email: data.email,
        isSystemRoot: true,
        publicKey,
        publicKeyCreatedAt: new Date(),
      });

      const user = await this.userRepository.create(userData as any);

      return {
        user,
        privateKeyPem,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Ed25519 PEM 파일로 비밀번호 리셋 (통합된 단일 메서드)
   */
  async resetRootPassword(
    pemContent: string,
    newPassword: string,
  ): Promise<{
    username: string;
    message: string;
  }> {
    try {
      // 1. PEM 파일 검증
      if (!this.pemKeyService.validateEd25519PemFile(pemContent)) {
        throw new Error('유효하지 않은 Ed25519 PEM 파일입니다.');
      }

      // 2. 메타데이터 추출
      const metadata =
        this.pemKeyService.extractEd25519MetadataFromPem(pemContent);

      // 3. 사용자 조회
      const user = await this.userRepository.findByUsername(metadata.username);
      if (!user || !user.isSystemRoot || !user.publicKey) {
        throw new NotFoundException('루트 사용자를 찾을 수 없습니다.');
      }

      // 4. Private Key 추출
      const privateKey = this.pemKeyService.extractEd25519PrivateKeyFromPem(
        pemContent,
      );

      // 5. 키 쌍 일치 확인 (PEM 파일 인증)
      const testData = `password-reset-${Date.now()}`;
      const testSignature = this.pemKeyService.signEd25519(
        testData,
        privateKey,
      );
      const isValidKeyPair = this.pemKeyService.verifyEd25519(
        testData,
        testSignature,
        user.publicKey,
      );

      if (!isValidKeyPair) {
        throw new Error('PEM 파일의 개인키와 저장된 공개키가 일치하지 않습니다.');
      }

      // 6. 새 비밀번호 해시 생성
      const newPasswordHash = await this.hashService.hash(newPassword);

      // 7. 비밀번호 변경
      await this.userRepository.updatePassword(user.id, newPasswordHash);

      this.logger.log(`루트 사용자 ${metadata.username}의 비밀번호가 성공적으로 변경되었습니다.`);

      return {
        username: user.username,
        message: '비밀번호가 성공적으로 변경되었습니다.',
      };
    } catch (error) {
      this.logger.error('루트 비밀번호 리셋 실패:', error);
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
      if (!user || !user.isSystemRoot) {
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
