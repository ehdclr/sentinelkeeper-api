import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseConfigService } from './database/config/database-config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const prefix = process.env.PREFIX || 'api';
    const version = process.env.VERSION || 'v1';

    app.enableCors();
    app.setGlobalPrefix(`${prefix}/${version}`);
    app.useGlobalFilters(new HttpExceptionFilter());
    const configService = app.get(DatabaseConfigService);

    if (!configService.isConfigured()) {
      console.log('\n🔧 데이터 베이스 설정이 필요합니다.');
      console.log('═══════════════════════════════════════');
      console.log('📍 설정 엔드포인트: POST /setup/database');
      console.log('📊 상태 엔드포인트: GET /setup/status');
      console.log('🧪 테스트 엔드포인트: POST /setup/test-connection');
      console.log('📋 예제: GET /setup/examples');
      console.log('');
      console.log('SQLite 설정 예제:');
      console.log('curl -X POST http://localhost:3000/setup/database \\');
      console.log('  -H "Content-Type: application/json" \\');
      console.log('  -d \'{"type": "sqlite", "database": "app.db"}\'');
      console.log('═══════════════════════════════════════\n');
    } else {
      console.log('✅ 데이터 베이스 설정 완료 및 준비됨');

      // 연결 테스트
      const connectionTest = await configService.testConnection();
      if (connectionTest.success) {
        console.log('🟢 데이터 베이스 연결 확인됨');
      } else {
        console.log('🔴 데이터 베이스 연결 실패:', connectionTest.error);
      }
    }

    const port = process.env.PORT || 8000;
    await app.listen(port);
    console.log(
      `🚀 Application is running on: http://localhost:${port}/${prefix}/${version}`,
    );
  } catch (error: any) {
    console.error('❌ 애플리케이션 시작 실패:', error.message);

    process.exit(1);
  }
}

bootstrap();
