import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CryptoService } from './crypto.service';

@Injectable()
export class PemKeyService {
  private readonly logger = new Logger(PemKeyService.name);
  private readonly RECOVERY_DATA_VERSION = 'v2.0'; // Ed25519 버전

  constructor(private readonly cryptoService: CryptoService) {}

  // ========================
  // 기존 대칭키 방식 (호환성)
  // ========================

  /**
   * 루트 사용자용 PEM 키 생성 (기존 방식)
   */
  async generateRootPemKey(
    username: string,
    email?: string,
  ): Promise<{
    pemKey: string;
    recoveryKeyId: string;
    encryptedRecoveryData: string;
  }> {
    try {
      const keyId = randomBytes(16).toString('hex');
      const masterKey = randomBytes(32).toString('hex'); // 64자리 hex 문자열
      const createdAt = new Date().toISOString();

      // 복구에 필요한 데이터
      const recoveryData = {
        username,
        email,
        version: this.RECOVERY_DATA_VERSION,
        createdAt,
      };

      this.logger.debug('생성할 복구 데이터:', recoveryData);

      // 단순 암호화 - 마스터키만 사용
      const encryptedRecoveryData = this.cryptoService.encryptSimple(
        JSON.stringify(recoveryData),
        masterKey,
      );

      this.logger.debug(
        '암호화된 복구 데이터 길이:',
        encryptedRecoveryData.length,
      );

      // PEM 파일 생성
      const pemKey = this.generatePemFileContent(
        keyId,
        masterKey,
        username,
        createdAt,
      );

      return {
        pemKey,
        recoveryKeyId: keyId,
        encryptedRecoveryData, // 단순한 Base64 문자열
      };
    } catch (error) {
      this.logger.error('PEM 키 생성 실패:', error);
      throw new Error('PEM 키 생성에 실패했습니다.');
    }
  }

  /**
   * PEM 키 파싱 (기존 방식)
   */
  parsePemKey(pemContent: string): {
    keyId: string;
    masterKey: string;
  } {
    try {
      if (!this.validatePemKey(pemContent)) {
        throw new Error('유효하지 않은 PEM 키 형식입니다.');
      }

      const lines = pemContent.split('\n');

      const keyId = lines
        .find((line) => line.startsWith('Key-ID:'))
        ?.split(': ')[1]
        ?.trim();

      const masterKey = lines
        .find((line) => line.length === 64 && !line.includes(':'))
        ?.trim();

      if (!keyId || !masterKey) {
        this.logger.error('PEM 키 파싱 실패 - keyId 또는 masterKey 없음');
        throw new Error('유효하지 않은 PEM 키입니다.');
      }

      this.logger.debug('PEM 키 파싱 성공:', {
        keyId,
        masterKeyLength: masterKey.length,
      });
      return { keyId, masterKey };
    } catch (error) {
      this.logger.error('PEM 키 파싱 실패:', error);
      throw error;
    }
  }

  /**
   * 복구 데이터 복호화 (기존 방식) - 개선된 에러 처리
   */
  async decryptRecoveryData(
    encryptedData: string,
    masterKey: string,
  ): Promise<{
    username: string;
    email?: string;
  }> {
    try {
      this.logger.debug('복호화 시작:', {
        encryptedDataLength: encryptedData.length,
        masterKeyLength: masterKey.length,
      });

      // 1. 복호화 시도
      const recoveryData = this.cryptoService.decryptSimple(
        encryptedData,
        masterKey,
      );

      this.logger.debug('복호화 결과:', {
        recoveryData: recoveryData.substring(0, 100) + '...',
        length: recoveryData.length,
      });

      // 2. JSON 파싱 전 데이터 검증
      if (!recoveryData || typeof recoveryData !== 'string') {
        throw new Error('복호화 결과가 유효하지 않습니다.');
      }

      // 3. JSON 파싱 시도
      let parsedData;
      try {
        parsedData = JSON.parse(recoveryData);
      } catch (jsonError: any) {
        this.logger.error('JSON 파싱 실패:', {
          error: jsonError.message,
          recoveryData: recoveryData.substring(0, 200),
          charCodes: recoveryData
            .split('')
            .slice(0, 20)
            .map((c) => c.charCodeAt(0)),
        });
        throw new Error(`JSON 파싱 실패: ${jsonError.message}`);
      }

      // 4. 파싱된 데이터 검증
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('복호화된 데이터가 올바른 객체가 아닙니다.');
      }

      if (!parsedData.username) {
        throw new Error('복호화된 데이터에 username이 없습니다.');
      }

      this.logger.debug('복구 데이터 복호화 성공:', {
        username: parsedData.username,
        email: parsedData.email,
        version: parsedData.version,
      });

      return {
        username: parsedData.username,
        email: parsedData.email,
      };
    } catch (error: any) {
      this.logger.error('복구 데이터 복호화 실패:', error);
      throw new Error(`복구 데이터 복호화에 실패했습니다: ${error.message}`);
    }
  }

  // ========================
  // Ed25519 Zero-Knowledge 방식
  // ========================

  /**
   * Ed25519 루트 사용자 키쌍 생성
   */
  async generateEd25519RootKeyPair(
    username: string,
    email?: string,
  ): Promise<{
    publicKey: string;
    privateKeyPem: string;
  }> {
    try {
      // CryptoService를 통해 Ed25519 키쌍 생성
      const { publicKey, privateKey } =
        this.cryptoService.generateEd25519KeyPair();
      const createdAt = new Date().toISOString();

      // Private Key PEM 파일 생성 (클라이언트 다운로드용)
      const privateKeyPem = this.generateEd25519PrivateKeyPem(
        privateKey,
        username,
        email,
        createdAt,
      );

      return {
        publicKey, // DB에 저장될 공개키
        privateKeyPem, // 클라이언트에게 제공될 개인키 PEM 파일
      };
    } catch (error) {
      this.logger.error('Ed25519 키쌍 생성 실패:', error);
      throw new Error('키쌍 생성에 실패했습니다.');
    }
  }

  /**
   * Ed25519 Private Key PEM 파일 생성
   */
  private generateEd25519PrivateKeyPem(
    privateKey: string,
    username: string,
    email?: string,
    createdAt?: string,
  ): string {
    const timestamp = createdAt || new Date().toISOString();
    const emailLine = email ? `Email: ${email}` : '';

    return `-----BEGIN SENTINELKEEPER ROOT RECOVERY KEY-----
Username: ${username}
${emailLine}
Created: ${timestamp}
Type: ROOT-PERMANENT
Algorithm: Ed25519
Version: ${this.RECOVERY_DATA_VERSION}
Mode: Zero-Knowledge

${privateKey}

-----END SENTINELKEEPER ROOT RECOVERY KEY-----

# SENTINELKEEPER 루트 복구 키 (Ed25519)
# 
# 이 키로 ${username} 계정을 복구할 수 있습니다.
# 생성일: ${timestamp}
# 알고리즘: Ed25519 (타원곡선 디지털 서명)
# 
# 보안 주의사항:
# - 이 개인키를 안전한 곳에 보관하세요
# - 다른 사람과 절대 공유하지 마세요
# - 서버에는 공개키만 저장됩니다 (Zero-Knowledge)
# - 복구 시에만 사용하세요
# 
# 사용 방법:
# 1. 패스워드 리셋 요청 시 이 파일을 업로드
# 2. 새 비밀번호와 함께 서명 생성
# 3. 서버에서 공개키로 서명 검증
`;
  }

  /**
   * Ed25519 PEM 파일에서 Private Key 추출
   */
  extractEd25519PrivateKeyFromPem(pemContent: string): string {
    try {
      const lines = pemContent.split('\n');
      const beginIndex = lines.findIndex((line) =>
        line.includes('-----BEGIN PRIVATE KEY-----'),
      );
      const endIndex = lines.findIndex((line) =>
        line.includes('-----END PRIVATE KEY-----'),
      );

      if (beginIndex === -1 || endIndex === -1) {
        throw new Error('유효하지 않은 PEM 파일 형식입니다.');
      }

      return lines.slice(beginIndex, endIndex + 1).join('\n');
    } catch (error) {
      this.logger.error('Private Key 추출 실패:', error);
      throw new Error('Private Key 추출에 실패했습니다.');
    }
  }

  /**
   * Ed25519 PEM 파일에서 메타데이터 추출
   */
  extractEd25519MetadataFromPem(pemContent: string): {
    username: string;
    email?: string;
    createdAt: string;
    algorithm: string;
    version: string;
  } {
    try {
      const lines = pemContent.split('\n');

      const username = lines
        .find((line) => line.startsWith('Username:'))
        ?.split(': ')[1]
        ?.trim();

      const email = lines
        .find((line) => line.startsWith('Email:'))
        ?.split(': ')[1]
        ?.trim();

      const createdAt = lines
        .find((line) => line.startsWith('Created:'))
        ?.split(': ')[1]
        ?.trim();

      const algorithm = lines
        .find((line) => line.startsWith('Algorithm:'))
        ?.split(': ')[1]
        ?.trim();

      const version = lines
        .find((line) => line.startsWith('Version:'))
        ?.split(': ')[1]
        ?.trim();

      if (!username || !createdAt || !algorithm || !version) {
        throw new Error('PEM 파일에서 필수 메타데이터를 찾을 수 없습니다.');
      }

      return {
        username,
        email: email || undefined,
        createdAt,
        algorithm,
        version,
      };
    } catch (error) {
      this.logger.error('메타데이터 추출 실패:', error);
      throw new Error('메타데이터 추출에 실패했습니다.');
    }
  }

  /**
   * Ed25519 PEM 파일 검증
   */
  validateEd25519PemFile(pemContent: string): boolean {
    try {
      return (
        pemContent.includes(
          '-----BEGIN SENTINELKEEPER ROOT RECOVERY KEY-----',
        ) &&
        pemContent.includes('-----END SENTINELKEEPER ROOT RECOVERY KEY-----') &&
        pemContent.includes('-----BEGIN PRIVATE KEY-----') &&
        pemContent.includes('-----END PRIVATE KEY-----') &&
        pemContent.includes('Algorithm: Ed25519') &&
        pemContent.includes('Mode: Zero-Knowledge')
      );
    } catch (error) {
      this.logger.error('PEM 파일 검증 실패:', error);
      return false;
    }
  }

  /**
   * 패스워드 리셋 서명 데이터 생성
   */
  generatePasswordResetSignatureData(
    username: string,
    newPasswordHash: string,
    timestamp?: number,
  ): string {
    const signatureData = {
      username,
      action: 'password_reset',
      newPasswordHash,
      timestamp: timestamp || Date.now(),
    };

    return JSON.stringify(signatureData);
  }

  // ========================
  // 기존 대칭키 방식 (호환성)
  // ========================

  /**
   * PEM 파일 내용 생성 (기존 방식)
   */
  private generatePemFileContent(
    keyId: string,
    masterKey: string,
    username: string,
    createdAt: string,
  ): string {
    return `-----BEGIN SENTINELKEEPER RECOVERY KEY-----
Key-ID: ${keyId}
Username: ${username}
Created: ${createdAt}
Type: ROOT-PERMANENT
Version: ${this.RECOVERY_DATA_VERSION}

${masterKey}

-----END SENTINELKEEPER RECOVERY KEY-----

# SENTINELKEEPER 루트 복구 키 (기존 방식)
# 
# 이 키로 ${username} 계정을 복구할 수 있습니다.
# 생성일: ${createdAt}
# 
# 보안 주의사항:
# - 이 파일을 안전한 곳에 보관하세요
# - 다른 사람과 공유하지 마세요
# - 복구 시에만 사용하세요
`;
  }

  /**
   * PEM 키 검증 (기존 방식)
   */
  validatePemKey(pemContent: string): boolean {
    return (
      pemContent.includes('-----BEGIN SENTINELKEEPER RECOVERY KEY-----') &&
      pemContent.includes('-----END SENTINELKEEPER RECOVERY KEY-----')
    );
  }
}
