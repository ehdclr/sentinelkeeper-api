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
   * 단순 AES-256-GCM 암호화 (마스터키 직접 사용)
   */
  encryptSimple(plaintext: string, masterKey: string): string {
    try {
      // 마스터키를 32바이트로 해싱
      const key = createHash('sha256').update(masterKey).digest();
      const iv = randomBytes(this.IV_LENGTH);

      const cipher = createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // IV + Tag + Encrypted 를 하나의 문자열로 결합
      const combined = iv.toString('hex') + tag.toString('hex') + encrypted;

      return Buffer.from(combined, 'hex').toString('base64');
    } catch (error) {
      this.logger.error('암호화 실패:', error);
      throw new Error('암호화 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 단순 AES-256-GCM 복호화
   */
  decryptSimple(encryptedString: string, masterKey: string): string {
    try {
      // Base64 디코딩
      const combined = Buffer.from(encryptedString, 'base64').toString('hex');

      // 구성 요소 분리
      const ivHex = combined.substring(0, this.IV_LENGTH * 2);
      const tagHex = combined.substring(
        this.IV_LENGTH * 2,
        (this.IV_LENGTH + this.TAG_LENGTH) * 2,
      );
      const encryptedHex = combined.substring(
        (this.IV_LENGTH + this.TAG_LENGTH) * 2,
      );

      // 마스터키를 32바이트로 해싱
      const key = createHash('sha256').update(masterKey).digest();

      const decipher = createDecipheriv(
        this.ALGORITHM,
        key,
        Buffer.from(ivHex, 'hex'),
      );
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
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
