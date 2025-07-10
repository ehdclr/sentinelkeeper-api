import { Injectable, Logger } from '@nestjs/common';
import {
  randomBytes,
  createHash,
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
} from 'crypto';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);

  // 보안 상수
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly SALT_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly TAG_LENGTH = 16;
  private readonly KEY_LENGTH = 32;
  private readonly ALGORITHM = 'aes-256-gcm';

  /**
   * 안전한 랜덤 솔트 생성
   */
  generateSalt(): string {
    return randomBytes(this.SALT_LENGTH).toString('hex');
  }

  /**
   * PBKDF2를 사용한 키 유도
   */
  deriveKey(password: string, salt: string): Buffer {
    return pbkdf2Sync(
      password,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      'sha256',
    );
  }

  /**
   * AES-256-GCM 암호화
   */
  encrypt(
    plaintext: string,
    masterKey: string,
  ): {
    encrypted: string;
    salt: string;
    iv: string;
    tag: string;
  } {
    try {
      const salt = this.generateSalt();
      const iv = randomBytes(this.IV_LENGTH);
      const key = this.deriveKey(masterKey, salt);

      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from(salt, 'hex'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted,
        salt,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      this.logger.error('암호화 실패:', error);
      throw new Error('암호화 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * AES-256-GCM 복호화
   */
  decrypt(
    encryptedData: {
      encrypted: string;
      salt: string;
      iv: string;
      tag: string;
    },
    masterKey: string,
  ): string {
    try {
      const key = this.deriveKey(masterKey, encryptedData.salt);

      const decipher = createDecipheriv(
        this.ALGORITHM,
        key,
        Buffer.from(encryptedData.iv, 'hex'),
      );
      decipher.setAAD(Buffer.from(encryptedData.salt, 'hex'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('복호화 실패:', error);
      throw new Error('복호화 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * SHA-256 해시 생성
   */
  hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * 시간 기반 안전한 문자열 비교
   */
  safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
