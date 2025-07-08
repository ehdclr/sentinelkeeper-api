import { Controller, Get } from '@nestjs/common';
import { DatabaseConfigService } from '../database/config/database-config.service';
import { ResponseBuilder } from '../common/decorators/api-response.decorator';

@Controller('health')
export class HealthController {
  constructor(private configService: DatabaseConfigService) {}

  @Get()
  async getHealth() {
    const status = this.configService.getSetupStatus();

    if (!status.configured) {
      return ResponseBuilder.success(
        {
          status: '설정 필요',
          database: null,
          setup_url: '/setup/database',
        },
        '데이터 베이스 설정이 필요합니다.',
      );
    }

    // 설정된 경우 연결 테스트
    const connectionTest = await this.configService.testConnection();
    const healthData = {
      status: connectionTest.success ? 'healthy' : 'unhealthy',
      database: {
        type: status.type,
        configured: true,
        locked: true,
        configuredAt: status.createdAt,
        connectionTest: {
          success: connectionTest.success,
          error: connectionTest.error || null,
        },
      },
    };

    return ResponseBuilder.success(
      healthData,
      connectionTest.success
        ? '애플리케이션 상태 정상'
        : '데이터 베이스 연결 실패',
    );
  }

  @Get('database')
  async getDatabaseHealth() {
    if (!this.configService.isConfigured()) {
      return ResponseBuilder.error(
        '데이터 베이스 설정이 필요합니다.',
        '설정 필요',
      );
    }

    const connectionTest = await this.configService.testConnection();
    const config = this.configService.getConfig();

    const dbHealth = {
      configured: true,
      type: config.type,
      database: config.database,
      host: config.host || 'N/A',
      connection: {
        success: connectionTest.success,
        error: connectionTest.error || null,
        details: connectionTest.details,
      },
      createdAt: config.createdAt,
    };

    return ResponseBuilder.success(
      dbHealth,
      connectionTest.success
        ? '데이터 베이스 연결 성공'
        : '데이터 베이스 연결 실패',
    );
  }
}
