import { Injectable, Logger } from '@nestjs/common';
import {
  randomBytes,
  createHash,
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  createSign,
  createVerify,
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
   * 에러 메시지 추출 헬퍼
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

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
      if (!plaintext || !masterKey) {
        throw new Error('plaintext와 masterKey는 필수입니다.');
      }

      // 마스터키를 32바이트로 해싱
      const key = createHash('sha256').update(masterKey).digest();
      const iv = randomBytes(this.IV_LENGTH);

      const cipher = createCipheriv(this.ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // IV + Tag + Encrypted 를 하나의 문자열로 결합
      const combined = iv.toString('hex') + tag.toString('hex') + encrypted;
      const result = Buffer.from(combined, 'hex').toString('base64');

      this.logger.debug('암호화 성공:', {
        plaintextLength: plaintext.length,
        resultLength: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error('암호화 실패:', error);
      throw new Error(
        `암호화 처리 중 오류가 발생했습니다: ${this.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * 단순 AES-256-GCM 복호화 - 개선된 에러 처리
   */
  decryptSimple(encryptedString: string, masterKey: string): string {
    try {
      if (!encryptedString || !masterKey) {
        throw new Error('encryptedString과 masterKey는 필수입니다.');
      }

      this.logger.debug('복호화 시작:', {
        encryptedLength: encryptedString.length,
        masterKeyLength: masterKey.length,
      });

      // 1. Base64 디코딩
      let combined: string;
      try {
        combined = Buffer.from(encryptedString, 'base64').toString('hex');
      } catch (error) {
        throw new Error('Base64 디코딩 실패');
      }

      // 2. 길이 검증
      const minLength = (this.IV_LENGTH + this.TAG_LENGTH) * 2;
      if (combined.length < minLength) {
        throw new Error(
          `암호화된 데이터가 너무 짧습니다. 최소 ${minLength}자 필요, 현재 ${combined.length}자`,
        );
      }

      // 3. 구성 요소 분리
      const ivHex = combined.substring(0, this.IV_LENGTH * 2);
      const tagHex = combined.substring(
        this.IV_LENGTH * 2,
        (this.IV_LENGTH + this.TAG_LENGTH) * 2,
      );
      const encryptedHex = combined.substring(
        (this.IV_LENGTH + this.TAG_LENGTH) * 2,
      );

      this.logger.debug('구성 요소 분리:', {
        ivLength: ivHex.length,
        tagLength: tagHex.length,
        encryptedLength: encryptedHex.length,
      });

      // 4. 마스터키를 32바이트로 해싱
      const key = createHash('sha256').update(masterKey).digest();

      // 5. 복호화 수행
      const decipher = createDecipheriv(
        this.ALGORITHM,
        key,
        Buffer.from(ivHex, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      this.logger.debug('복호화 성공:', {
        decryptedLength: decrypted.length,
        preview: decrypted.substring(0, 50) + '...',
      });

      return decrypted;
    } catch (error) {
      this.logger.error('복호화 실패:', {
        error: this.getErrorMessage(error),
        encryptedLength: encryptedString?.length,
        masterKeyLength: masterKey?.length,
      });
      throw new Error(
        `복호화 처리 중 오류가 발생했습니다: ${this.getErrorMessage(error)}`,
      );
    }
  }

  // ===================
  // Ed25519 암호화 로직
  // ===================

  /**
   * Ed25519 키쌍 생성
   */
  generateEd25519KeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    try {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      return {
        publicKey,
        privateKey,
      };
    } catch (error) {
      this.logger.error('Ed25519 키쌍 생성 실패:', error);
      throw new Error('키쌍 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * Ed25519 서명 생성
   */
  signEd25519(data: string, privateKey: string): string {
    try {
      const sign = createSign('ed25519');
      sign.update(data);
      return sign.sign(privateKey, 'base64');
    } catch (error) {
      this.logger.error('Ed25519 서명 생성 실패:', error);
      throw new Error('서명 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * Ed25519 서명 검증
   */
  verifyEd25519(data: string, signature: string, publicKey: string): boolean {
    try {
      const verify = createVerify('ed25519');
      verify.update(data);
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      this.logger.error('Ed25519 서명 검증 실패:', error);
      return false;
    }
  }

  /**
   * 패스워드 리셋 챌린지 생성
   */
  generatePasswordResetChallenge(): {
    challenge: string;
    challengeData: string;
  } {
    try {
      const challenge = randomBytes(32).toString('hex');
      const timestamp = Date.now();
      const challengeData = JSON.stringify({
        challenge,
        timestamp,
        action: 'password_reset',
      });

      return {
        challenge,
        challengeData,
      };
    } catch (error) {
      this.logger.error('챌린지 생성 실패:', error);
      throw new Error('챌린지 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 챌린지 검증 (시간 제한 포함)
   */
  validateChallenge(
    challengeData: string,
    signature: string,
    publicKey: string,
    maxAgeMs: number = 300000, // 5분
  ): boolean {
    try {
      const parsed = JSON.parse(challengeData);
      const now = Date.now();

      // 시간 제한 확인
      if (now - parsed.timestamp > maxAgeMs) {
        this.logger.warn('챌린지 시간 만료');
        return false;
      }

      // 서명 검증
      return this.verifyEd25519(challengeData, signature, publicKey);
    } catch (error) {
      this.logger.error('챌린지 검증 실패:', error);
      return false;
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
