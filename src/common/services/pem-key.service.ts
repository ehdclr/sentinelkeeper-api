import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { FileService } from './file.service';
import { CryptoService } from './crypto.service';

@Injectable()
export class PemKeyService {
  private readonly logger = new Logger(PemKeyService.name);

  private readonly RECOVERY_DATA_VERSION = 'v1.0';
  private readonly KEYS_DIR = 'recovery-keys';

  constructor(
    private readonly fileService: FileService,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * 루트 사용자용 PEM 키 생성
   */
  generateRootPemKey(username: string, email?: string): string {
    const keyId = randomBytes(16).toString('hex');
    const masterKey = randomBytes(32).toString('hex');
    const createdAt = new Date().toISOString();

    // 복구에 필요한 데이터
    const recoveryData = {
      username,
      email,
      version: this.RECOVERY_DATA_VERSION,
      createdAt,
    };

    // 복구 데이터를 마스터 키로 암호화
    const encryptedRecoveryData = this.cryptoService.encrypt(
      JSON.stringify(recoveryData),
      masterKey,
    );

    // 서버에 암호화된 복구 데이터만 저장
    this.saveRecoveryData(keyId, encryptedRecoveryData);

    // PEM 파일 생성
    const pemKey = this.generatePemFileContent(
      keyId,
      masterKey,
      username,
      createdAt,
    );

    return pemKey;
  }

  /**
   * PEM 키를 파일로 저장
   */
  async savePemKey(username: string, pemKey: string): Promise<string> {
    const fileName = `root-user-${username}.pem`;
    const filePath = `keys/${fileName}`;

    await this.fileService.ensureDirectory('keys');
    await this.fileService.writeFile(filePath, pemKey);

    this.logger.log(`PEM key saved for user ${username} at ${filePath}`);
    return filePath;
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
   * 서버에 암호화된 복구 데이터만 저장
   */
  private async saveRecoveryData(
    keyId: string,
    encryptedData: any,
  ): Promise<void> {
    try {
      await this.fileService.ensureDirectory(this.KEYS_DIR);

      const filePath = `${this.KEYS_DIR}/${keyId}.json`;
      const storageData = {
        keyId,
        encryptedRecoveryData: encryptedData,
        createdAt: new Date().toISOString(),
      };

      await this.fileService.writeFile(
        filePath,
        JSON.stringify(storageData, null, 2),
      );
      this.logger.log(`복구 데이터 저장됨: ${keyId}`);
    } catch (error) {
      this.logger.error('복구 데이터 저장 실패:', error);
      throw new Error('복구 데이터 저장에 실패했습니다.');
    }
  }

  /**
   * PEM 키 복구 처리
   */
  async recoverWithPemKey(pemContent: string): Promise<{
    username: string;
    email?: string;
  }> {
    // 1. PEM 키에서 keyId와 masterKey 추출
    const { keyId, masterKey } = this.parsePemKey(pemContent);

    // 2. 서버에서 해당 keyId의 암호화된 데이터 조회
    const recoveryFile = await this.getRecoveryFile(keyId);

    // 3. 마스터 키로 복구 데이터 복호화
    const recoveryData = this.cryptoService.decrypt(
      recoveryFile.encryptedRecoveryData,
      masterKey,
    );

    const parsedData = JSON.parse(recoveryData);

    return {
      username: parsedData.username,
      email: parsedData.email,
    };
  }

  /**
   * PEM 키 파싱
   */
  private parsePemKey(pemContent: string): {
    keyId: string;
    masterKey: string;
  } {
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
   * 복구 파일 조회
   */
  private async getRecoveryFile(keyId: string): Promise<any> {
    try {
      const filePath = `${this.KEYS_DIR}/${keyId}.json`;
      const fileContent = await this.fileService.readFile(filePath);
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error('복구 키를 찾을 수 없습니다.');
    }
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
