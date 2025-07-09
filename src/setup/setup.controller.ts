import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { DatabaseConfigService } from '../database/services/database-config.service';
import { SetupDatabaseSchema } from '../database/schemas/setup.schema';
import { SetupDatabaseDto } from '../database/schemas/setup.schema';
import { join } from 'path';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ResponseBuilder } from '../common/decorators/api-response.decorator';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { DatabaseConfig } from '@/database/config/database-config.interface';
import { UserService } from '@/users/services/user.service';

@Controller('setup')
export class SetupController {
  constructor(
    private configService: DatabaseConfigService,
    private userService: UserService,
  ) {}

  @Get('status')
  async getSetupStatus() {
    const dbStatus = this.configService.getSetupStatus();

    if (!dbStatus.configured) {
      return ResponseBuilder.error(
        '데이터 베이스 설정이 필요합니다.',
        '데이터 베이스 설정이 필요합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rootUserExists = await this.userService.checkRootUserExists();

    if (!rootUserExists) {
      return ResponseBuilder.error(
        '루트 계정 생성이 필요합니다.',
        '루트 계정 생성이 필요합니다.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return ResponseBuilder.success(
      {
        database: dbStatus.type,
        rootUserExists,
      },
      '초기 설정이 완료되었습니다.',
      HttpStatus.OK,
    );
  }

  @Post('database')
  @UsePipes(new ZodValidationPipe(SetupDatabaseSchema))
  async setupDatabase(@Body() setupDto: SetupDatabaseDto) {
    console.log(`🔧 데이터 베이스 설정 시작: ${setupDto.type}`);

    const result = await this.configService.initializeDatabase(setupDto);

    if (!result.success) {
      return ResponseBuilder.error(
        result.message,
        '데이터 베이스 설정 실패',
        HttpStatus.BAD_REQUEST,
      );
    }

    const status = this.configService.getSetupStatus();
    console.log('📊 Post-setup status:', status);
    return ResponseBuilder.success(
      {
        type: setupDto.type,
        locked: status.locked,
        files: {
          configExists: status.configExists,
          lockExists: status.lockExists,
          configured: status.configured,
        },
      },
      result.message,
    );
  }

  @Post('test-connection')
  @UsePipes(new ZodValidationPipe(SetupDatabaseSchema))
  async testConnection(@Body() setupDto: SetupDatabaseDto) {
    console.log(`🔍 연결 테스트 시작: ${setupDto.type}`);

    // 임시 설정으로 연결 테스트
    const tempConfig = {
      ...setupDto,
      readonly: true as const,
      createdAt: new Date().toISOString(),
      hash: 'temp-hash',
    } as DatabaseConfig;

    const result = await this.configService.testConnection(tempConfig);
    if (!result.success) {
      return ResponseBuilder.error(
        `${setupDto.type} 연결 테스트 실패: ${result.error}`,
        '연결 실패',
        HttpStatus.BAD_REQUEST,
      );
    }

    return ResponseBuilder.success(
      {
        type: setupDto.type,
        details: result.details,
      },
      `✅ ${setupDto.type} 연결 성공`,
    );
  }

  @Get('repair')
  repairConfiguration() {
    const configPath = join(process.cwd(), 'database-config.json');
    const lockPath = join(process.cwd(), '.database-lock');

    if (!existsSync(configPath)) {
      return ResponseBuilder.error(
        'No configuration file found to repair',
        '복구 실패',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 기존 설정 읽기
    const configData = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData) as DatabaseConfig;

    // 해시 재계산
    const { hash, ...configWithoutHash } = config;
    const newHash = createHash('sha256')
      .update(
        JSON.stringify({
          type: config.type,
          database: config.database,
          host: config.type === 'sqlite' ? 'N/A' : config.host || 'N/A',
          port: config.type === 'sqlite' ? 0 : config.port || 0,
          username: config.type === 'sqlite' ? 'N/A' : config.username || 'N/A',
          password: config.type === 'sqlite' ? 'N/A' : config.password || 'N/A',
          ssl: config.type === 'sqlite' ? false : config.ssl || false,
          readonly: config.readonly,
          createdAt: config.createdAt,
        }),
      )
      .digest('hex');

    // 새 해시로 업데이트
    config.hash = newHash;
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 락 파일 재생성
    const lockData = {
      lockedAt: new Date().toISOString(),
      type: config.type,
      hash: newHash,
      database: config.database,
      message: '데이터 베이스 설정이 잠겨있어 변경할 수 없습니다.',
      repaired: true,
    };
    writeFileSync(lockPath, JSON.stringify(lockData, null, 2));

    return ResponseBuilder.success(
      {
        type: config.type,
        newHash: newHash.substring(0, 16) + '...',
      },
      '설정 복구 완료',
    );
  }

  @Get('reset')
  resetConfiguration() {
    const configPath = join(process.cwd(), 'database-config.json');
    const lockPath = join(process.cwd(), '.database-lock');

    // 파일들 삭제
    if (existsSync(configPath)) {
      unlinkSync(configPath);
    }
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }

    return ResponseBuilder.success(
      {
        message: '데이터 베이스 설정이 초기화되었습니다.',
      },
      '데이터 베이스 설정이 초기화되었습니다.',
    );
  }
}
