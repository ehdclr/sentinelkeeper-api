// src/database/services/config-manager.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import {
  DatabaseConfig,
  DatabaseConfigSchema,
  SetupDatabaseDto,
  SetupDatabaseDtoSchema,
  SetupStatus,
  DatabaseConfigurationError,
  DatabaseLockError,
} from '../types/database.type';
import { DATABASE_CONFIG } from '../constants/database.constant';

@Injectable()
export class ConfigManagerService {
  private readonly logger = new Logger(ConfigManagerService.name);
  private readonly configPath = join(
    process.cwd(),
    DATABASE_CONFIG.CONFIG_FILE,
  );
  private readonly lockPath = join(process.cwd(), DATABASE_CONFIG.LOCK_FILE);

  private config: DatabaseConfig | null = null;
  private isLocked = false;

  /**
   * 설정 로드 (초기화 시 호출)
   */
  async loadConfig(): Promise<void> {
    try {
      // 락 파일 체크
      if (existsSync(this.lockPath)) {
        this.isLocked = true;
        this.loadExistingConfig();
        return;
      }

      // 기존 설정 파일 체크
      if (existsSync(this.configPath)) {
        this.loadExistingConfig();
        this.createLockFile();
        return;
      }

      // 첫 실행 시 - 설정 대기 상태
      this.logger.log(
        '데이터베이스 설정이 필요합니다. /setup/database 엔드포인트를 사용하여 설정해주세요.',
      );
    } catch (error) {
      this.logger.error('설정 로드 실패:', error);
      throw new DatabaseConfigurationError('설정 로드에 실패했습니다.');
    }
  }

  /**
   * 기존 설정 로드
   */
  private loadExistingConfig(): void {
    try {
      const configData = readFileSync(this.configPath, 'utf8');
      const parsedConfig = JSON.parse(configData);

      // Zod 스키마로 검증
      const validationResult = DatabaseConfigSchema.safeParse(parsedConfig);
      if (!validationResult.success) {
        this.logger.error(
          '설정 파일 스키마 검증 실패:',
          validationResult.error,
        );
        throw new DatabaseConfigurationError('설정 파일이 올바르지 않습니다.');
      }

      this.config = validationResult.data;

      this.logger.debug('Loaded config:', {
        type: this.config?.type,
        database: this.config?.database,
        hasHash: !!this.config?.hash,
        createdAt: this.config?.createdAt,
      });

      // 설정 무결성 검증
      if (this.config?.hash) {
        if (!this.verifyConfigIntegrity()) {
          this.logger.warn('설정 무결성 검증 실패, 해시 재계산...');
          this.updateConfigHash();
        }
      } else {
        this.logger.log('해시가 없습니다, 새로운 해시 생성...');
        this.updateConfigHash();
      }

      this.isLocked = true;
      this.logger.log(`데이터베이스 설정 로드 완료: ${this.config.type}`);
    } catch (error) {
      this.logger.error('데이터베이스 설정 로드 실패:', error);
      throw new DatabaseConfigurationError('설정 로드에 실패했습니다.');
    }
  }

  /**
   * 설정 무결성 검증
   */
  private verifyConfigIntegrity(): boolean {
    if (!this.config) return false;

    const { hash, ...configWithoutHash } = this.config;
    const calculatedHash = this.calculateHash(configWithoutHash);
    return hash === calculatedHash;
  }

  /**
   * 해시 계산
   */
  private calculateHash(config: Omit<DatabaseConfig, 'hash'>): string {
    const sortedConfig = {
      type: config.type,
      database: config.database,
      host: 'host' in config ? config.host : '',
      port: 'port' in config ? config.port : 0,
      username: 'username' in config ? config.username : '',
      password: 'password' in config ? config.password : '',
      ssl: 'ssl' in config ? config.ssl : false,
      readonly: config.readonly,
      createdAt: config.createdAt,
    };

    const configString = JSON.stringify(sortedConfig);
    const hash = createHash('sha256').update(configString).digest('hex');

    this.logger.debug('Hash calculation:', {
      configString: configString.substring(0, 100) + '...',
      hash: hash.substring(0, 16) + '...',
    });

    return hash;
  }

  /**
   * 설정 해시 업데이트
   */
  private updateConfigHash(): void {
    if (!this.config) return;

    const { hash, ...configWithoutHash } = this.config;
    this.config.hash = this.calculateHash(configWithoutHash);
    this.saveConfig();
    this.logger.log('설정 해시 업데이트 완료');
  }

  /**
   * 락 파일 생성
   */
  private createLockFile(): void {
    try {
      const lockData = {
        lockedAt: new Date().toISOString(),
        type: this.config?.type,
        hash: this.config?.hash,
        database: this.config?.database,
        message: '데이터베이스 설정이 잠겨있어 변경할 수 없습니다.',
      };

      this.logger.debug(`Creating lock file at: ${this.lockPath}`);
      writeFileSync(this.lockPath, JSON.stringify(lockData, null, 2));

      if (existsSync(this.lockPath)) {
        this.logger.log('락 파일 생성 완료');
        this.isLocked = true;
      } else {
        throw new Error('락 파일이 생성되지 않았습니다.');
      }
    } catch (error) {
      this.logger.error('락 파일 생성 실패:', error);
      throw new DatabaseConfigurationError('락 파일 생성에 실패했습니다.');
    }
  }

  /**
   * 설정 파일 저장
   */
  private saveConfig(): void {
    if (!this.config) {
      throw new DatabaseConfigurationError('저장할 설정이 없습니다.');
    }

    try {
      this.logger.debug(`Saving database config to: ${this.configPath}`);
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));

      if (existsSync(this.configPath)) {
        this.logger.log('데이터베이스 설정 파일 저장 완료');
      } else {
        throw new Error('설정 파일이 생성되지 않았습니다.');
      }
    } catch (error) {
      this.logger.error('설정 파일 저장 실패:', error);
      throw new DatabaseConfigurationError('설정 파일 저장에 실패했습니다.');
    }
  }

  /**
   * 새 설정 초기화 (한 번만 가능)
   */
  async initializeConfig(setupDto: SetupDatabaseDto): Promise<void> {
    if (this.isLocked || existsSync(this.lockPath)) {
      throw new DatabaseLockError();
    }

    if (existsSync(this.configPath)) {
      throw new DatabaseConfigurationError(
        '데이터베이스 설정 파일이 이미 존재합니다.',
      );
    }

    // DTO 검증
    const validationResult = SetupDatabaseDtoSchema.safeParse(setupDto);
    if (!validationResult.success) {
      throw new DatabaseConfigurationError(
        `설정 데이터가 올바르지 않습니다: ${validationResult.error.message}`,
      );
    }

    // 설정 객체 생성
    const configWithMeta: DatabaseConfig = {
      ...setupDto,
      readonly: true as const,
      createdAt: new Date().toISOString(),
      hash: '',
    } as DatabaseConfig;

    // 해시 계산
    const { hash, ...configForHash } = configWithMeta;
    configWithMeta.hash = this.calculateHash(configForHash);

    // 설정 저장
    this.config = configWithMeta;
    this.saveConfig();

    // 락 파일 생성
    this.createLockFile();

    this.logger.log(`데이터베이스 설정 초기화 완료: ${this.config.type}`);
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): DatabaseConfig {
    if (!this.config) {
      throw new DatabaseConfigurationError('데이터베이스 설정이 필요합니다.');
    }
    return this.config;
  }

  /**
   * 설정 여부 확인
   */
  isConfigured(): boolean {
    return !!this.config && this.isLocked;
  }

  /**
   * 설정 상태 조회
   */
  getSetupStatus(): SetupStatus {
    return {
      configured: this.isConfigured(),
      locked: this.isLocked,
      type: this.config?.type || null,
      createdAt: this.config?.createdAt || null,
      configExists: existsSync(this.configPath),
      lockExists: existsSync(this.lockPath),
    };
  }

  /**
   * 설정 변경 시도 시 에러 반환
   */
  updateConfig(): never {
    throw new DatabaseLockError('데이터베이스 설정은 변경할 수 없습니다.');
  }
}
