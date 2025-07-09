import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.log(`Directory created: ${dirPath}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf8');
    this.logger.log(`File written: ${filePath}`);
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf8');
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
