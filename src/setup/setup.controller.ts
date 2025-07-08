import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { DatabaseConfigService } from '../database/config/database-config.service';
import { SetupDatabaseSchema } from '../database/schemas/setup.schema';
import { SetupDatabaseDto } from '../database/schemas/setup.schema';
import { join } from 'path';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ResponseBuilder } from '../common/decorators/api-response.decorator';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { DatabaseConfig } from '@/database/config/database-config.interface';

@Controller('setup')
export class SetupController {
  constructor(private configService: DatabaseConfigService) {}

  @Get('status')
  getSetupStatus() {
    const status = this.configService.getSetupStatus();
    return {
      ...status,
      message: status.configured
        ? '데이터 베이스가 이미 설정되어 있습니다.'
        : '데이터 베이스 설정이 필요합니다.',
      endpoints: {
        setup: 'POST /setup/database',
        test: 'POST /setup/test-connection',
        status: 'GET /setup/status',
      },
    };
  }

  @Post('database')
  @UsePipes(new ZodValidationPipe(SetupDatabaseSchema))
  async setupDatabase(@Body() setupDto: SetupDatabaseDto) {
    console.log(`🔧 데이터 베이스 설정 시작: ${setupDto.type}`);
    try {
      const result = await this.configService.initializeDatabase(setupDto);

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            message: result.message,
            type: setupDto.type,
          },
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
    } catch (error: any) {
      console.error('❌ 데이터 베이스 설정 실패:', error);
      throw new HttpException(
        {
          success: false,
          message: error.message,
          type: setupDto.type,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('test-connection')
  @UsePipes(new ZodValidationPipe(SetupDatabaseSchema))
  async testConnection(@Body() setupDto: SetupDatabaseDto) {
    console.log(`🔍 연결 테스트 시작: ${setupDto.type}`);
    try {
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
        );
      }

      return ResponseBuilder.success(
        {
          type: setupDto.type,
          details: result.details,
        },
        `✅ ${setupDto.type} 연결 성공`,
      );
    } catch (error: any) {
      return ResponseBuilder.error(`❌ 연결 테스트 실패: ${error.message}`);
    }
  }

  @Get('repair')
  repairConfiguration() {
    try {
      const configPath = join(process.cwd(), 'database-config.json');
      const lockPath = join(process.cwd(), '.database-lock');

      if (!existsSync(configPath)) {
        return {
          success: false,
          message: 'No configuration file found to repair',
        };
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
            host: config.host || '',
            port: config.port || 0,
            username: config.username || '',
            password: config.password || '',
            ssl: config.ssl || false,
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

      return {
        success: true,
        message: '설정 복구 완료',
        type: config.type,
        newHash: newHash.substring(0, 16) + '...',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `복구 실패: ${error.message}`,
      };
    }
  }
  @Get('reset')
  resetConfiguration() {
    try {
      const configPath = join(process.cwd(), 'database-config.json');
      const lockPath = join(process.cwd(), '.database-lock');

      // 파일들 삭제
      if (existsSync(configPath)) {
        unlinkSync(configPath);
      }
      if (existsSync(lockPath)) {
        unlinkSync(lockPath);
      }

      return {
        success: true,
        message:
          '데이터 베이스 설정이 초기화되었습니다. 새로운 데이터 베이스 설정을 시작할 수 있습니다.',
        note: '리셋 후 애플리케이션을 다시 시작해주세요.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `리셋 실패: ${error.message}`,
      };
    }
  }
}
