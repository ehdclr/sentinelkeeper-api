import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { BcryptHashService } from '@/common/services/hash.service';
import { PemKeyService } from '@/common/services/pem-key.service';
import { CryptoService } from '@/common/services/crypto.service';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashService: BcryptHashService,
    private readonly pemKeyService: PemKeyService,
    private readonly cryptoService: CryptoService,
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

      // Ed25519 키쌍 생성 (Zero-Knowledge 방식)
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
        publicKey, // 공개키만 DB에 저장
        publicKeyCreatedAt: new Date(),
      });

      const user = await this.userRepository.create(userData as any);

      return {
        user,
        privateKeyPem, // 클라이언트에게 제공될 개인키 PEM
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resetPasswordWithEd25519(
    pemContent: string,
    newPassword: string,
    signature: string,
  ): Promise<{
    username: string;
    message: string;
  }> {
    try {
      // 1. PEM 파일 검증
      if (!this.pemKeyService.validateEd25519PemFile(pemContent)) {
        throw new Error('유효하지 않은 Ed25519 PEM 파일입니다.');
      }

      // 2. PEM에서 메타데이터 추출
      const metadata =
        this.pemKeyService.extractEd25519MetadataFromPem(pemContent);

      // 3. 사용자 조회
      const user = await this.userRepository.findByUsername(metadata.username);
      if (!user || !user.isSystemRoot || !user.publicKey) {
        throw new NotFoundException('루트 사용자를 찾을 수 없습니다.');
      }

      // 4. 새 비밀번호 해시 생성
      const newPasswordHash = await this.hashService.hash(newPassword);

      // 5. 서명 데이터 생성
      const signatureData =
        this.pemKeyService.generatePasswordResetSignatureData(
          metadata.username,
          newPasswordHash,
        );

      // 6. Ed25519 서명 검증
      const isValidSignature = this.cryptoService.verifyEd25519(
        signatureData,
        signature,
        user.publicKey,
      );

      if (!isValidSignature) {
        throw new Error('Ed25519 서명 검증에 실패했습니다.');
      }

      // 7. 비밀번호 변경
      await this.userRepository.updatePassword(user.id, newPasswordHash);

      return {
        username: user.username,
        message: '비밀번호가 성공적으로 변경되었습니다.',
      };
    } catch (error) {
      this.logger.error('비밀번호 리셋 실패:', error);
      throw error;
    }
  }

  // 기존 방식 (호환성 유지)
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
      const user = await this.userRepository.findByPublicKey(keyId);
      if (!user || !user.publicKey) {
        throw new NotFoundException('복구 키를 찾을 수 없습니다.');
      }

      // 3. 복구 데이터 복호화
      const recoveryData = await this.pemKeyService.decryptRecoveryData(
        user.publicKey,
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
      if (!user || !user.isSystemRoot) {
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(error);
    }
  }
}
