import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CryptoService } from './crypto.service';

@Injectable()
export class PemKeyService {
  private readonly logger = new Logger(PemKeyService.name);
  private readonly RECOVERY_DATA_VERSION = 'v1.0';

  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * 루트 사용자용 PEM 키 생성
   */
  async generateRootPemKey(
    username: string,
    email?: string,
  ): Promise<{
    pemKey: string;
    recoveryKeyId: string;
    encryptedRecoveryData: string;
  }> {
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

    // 단순 암호화 - 마스터키만 사용
    const encryptedRecoveryData = this.cryptoService.encryptSimple(
      JSON.stringify(recoveryData),
      masterKey,
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
  }

  /**
   * PEM 키 파싱
   */
  parsePemKey(pemContent: string): {
    keyId: string;
    masterKey: string;
  } {
    if (!this.validatePemKey(pemContent)) {
      throw new Error('유효하지 않은 PEM 키 형식입니다.');
    }

    const lines = pemContent.split('\n');

    const keyId = lines
      .find((line) => line.startsWith('Key-ID:'))
      ?.split(': ')[1];
    const masterKey = lines
      .find((line) => line.length === 64 && !line.includes(':'))
      ?.trim();

    if (!keyId || !masterKey) {
      throw new Error('유효하지 않은 PEM 키입니다.');
    }

    return { keyId, masterKey };
  }

  /**
   * 복구 데이터 복호화
   */
  async decryptRecoveryData(
    encryptedData: string,
    masterKey: string,
  ): Promise<{
    username: string;
    email?: string;
  }> {
    try {
      const recoveryData = this.cryptoService.decryptSimple(
        encryptedData,
        masterKey,
      );
      const parsedData = JSON.parse(recoveryData);

      return {
        username: parsedData.username,
        email: parsedData.email,
      };
    } catch (error) {
      throw new Error('복구 데이터 복호화에 실패했습니다.');
    }
  }

  /**
   * PEM 파일 내용 생성
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

# SENTINELKEEPER 루트 복구 키
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
   * PEM 키 검증
   */
  validatePemKey(pemContent: string): boolean {
    return (
      pemContent.includes('-----BEGIN SENTINELKEEPER RECOVERY KEY-----') &&
      pemContent.includes('-----END SENTINELKEEPER RECOVERY KEY-----')
    );
  }
}
