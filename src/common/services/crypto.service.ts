import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, pbkdf2Sync, createHash } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);

  // 비밀번호 해싱 상수
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly SALT_LENGTH = 32;

  /**
   * 안전한 랜덤 솔트 생성
   */
  generateSalt(): string {
    return randomBytes(this.SALT_LENGTH).toString('hex');
  }

  /**
   * PBKDF2를 사용한 키 유도 (비밀번호 해싱용)
   */
  deriveKey(password: string, salt: string): Buffer {
    return pbkdf2Sync(password, salt, this.PBKDF2_ITERATIONS, 32, 'sha256');
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
