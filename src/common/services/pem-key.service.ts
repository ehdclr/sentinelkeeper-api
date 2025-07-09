import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { FileService } from './file.service';

@Injectable()
export class PemKeyService {
  private readonly logger = new Logger(PemKeyService.name);

  constructor(private readonly fileService: FileService) {}

  generateRootPemKey(username: string): string {
    // 2048비트 RSA 키 생성 (실제로는 더 안전한 방법 사용)
    const keyLength = 2048;
    const keyData = randomBytes(keyLength / 8);
    const hash = createHash('sha256').update(keyData).digest('hex');

    return `-----BEGIN ROOT PEM KEY-----
Username: ${username}
Key: ${hash}
Generated: ${new Date().toISOString()}
-----END ROOT PEM KEY-----`;
  }

  generatePemFileContent(username: string, pemKey: string): string {
    return `# Root User PEM Key for ${username}
# Generated on ${new Date().toISOString()}
# Keep this file secure and do not share it

${pemKey}

# Usage Instructions:
# 1. Store this file in a secure location
# 2. Use this key for password recovery
# 3. Do not commit this file to version control
`;
  }

  async savePemKey(username: string, pemKey: string): Promise<string> {
    const fileName = `root-user-${username}.pem`;
    const filePath = `keys/${fileName}`;

    const content = this.generatePemFileContent(username, pemKey);

    await this.fileService.ensureDirectory('keys');
    await this.fileService.writeFile(filePath, content);

    this.logger.log(`PEM key saved for user ${username} at ${filePath}`);
    return filePath;
  }

  validatePemKey(pemKey: string): boolean {
    return (
      pemKey.includes('-----BEGIN ROOT PEM KEY-----') &&
      pemKey.includes('-----END ROOT PEM KEY-----')
    );
  }
}
