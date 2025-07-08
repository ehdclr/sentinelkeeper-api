// ==========================================
// 🎯 API 사용 플로우 완전 가이드
// ==========================================

/*
=== 초기 설치 프로세스 ===

Step 0: 상태 확인
GET /api/installation/status
Response: {
  "isInstalled": false,
  "currentStep": "database",
  "databaseConnected": false,
  "databaseType": null,
  "supportedDatabases": ["postgres", "sqlite", "mysql"]
}

Step 1-1: DB 연결 테스트
POST /api/installation/test-connection
Body: {
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "database": "sentinel",
  "username": "admin",
  "password": "password"
}
Response: {
  "success": true,
  "message": "Database connection successful!"
}

Step 1-2: DB 설정 완료
POST /api/installation/setup-database
Body: {
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "database": "sentinel",
  "username": "admin",
  "password": "password"
}
Response: {
  "success": true,
  "nextStep": "account",
  "message": "Database configured successfully! Now create your admin account."
}

Step 2: 상태 확인 (중간)
GET /api/installation/status
Response: {
  "isInstalled": false,
  "currentStep": "account",
  "databaseConnected": true,
  "databaseType": "postgres",
  "supportedDatabases": ["postgres", "sqlite", "mysql"]
}

Step 2: Root 계정 생성
POST /api/installation/create-account
Body: {
  "username": "admin",
  "email": "admin@example.com",
  "password": "AdminPassword123!",
  "confirmPassword": "AdminPassword123!"
}
Response: {
  "success": true,
  "message": "Installation completed successfully! You can now log in."
}

Step 3: 설치 완료 확인
GET /api/installation/status
Response: {
  "isInstalled": true,
  "currentStep": "completed",
  "databaseConnected": true,
  "databaseType": "postgres",
  "supportedDatabases": ["postgres", "sqlite", "mysql"]
}

=== SQLite 예시 ===

POST /api/installation/test-connection
Body: {
  "type": "sqlite",
  "database": "sentinel",
  "filename": "/app/data/sentinel.db"
}

POST /api/installation/setup-database
Body: {
  "type": "sqlite",
  "database": "sentinel",
  "filename": "/app/data/sentinel.db"
}

=== 에러 케이스 ===

연결 실패:
POST /api/installation/test-connection
Response: {
  "success": false,
  "message": "Failed to connect to database. Please check your settings."
}

잘못된 단계:
POST /api/installation/create-account (DB 설정 안된 상태)
Response: 400 Bad Request
{
  "message": "Database must be connected first"
}

=== 파일 시스템 구조 ===

프로젝트 루트/
├── src/                    # 소스 코드
├── data/                   # 데이터 디렉토리 (런타임 생성)
│   ├── temp-db-config.json # Step 1 완료 후 생성
│   ├── db-config.json      # Step 2 완료 후 생성 (최종)
│   └── sentinel.db         # SQLite 파일 (SQLite 선택시)
├── dist/                   # 빌드 결과물
└── package.json

data/db-config.json (최종 설정 파일):
{
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "database": "sentinel",
    "username": "admin"
  },
  "installedAt": "2025-01-07T12:34:56.789Z",
  "version": "1.0.0"
}
*/

// ==========================================
// 🎉 완성된 기능들
// ==========================================

/*
✅ Zod 우선 아키텍처
✅ 2단계 설치 프로세스
✅ 3개 DB 지원 (postgres/sqlite/mysql)
✅ 연결 테스트 기능
✅ CQRS 패턴
✅ 자동 DTO 생성 (nestjs-zod)
✅ Swagger 문서화
✅ 타입 안전성 (TypeScript + Zod)
✅ 설정 파일 관리
✅ 에러 처리
✅ 상태 관리

다음 단계:
🔄 Auth 도메인 구현
🔄 Dashboard 도메인 구현
🔄 프론트엔드 연결
🔄 Docker 설정
🔄 배포 준비
*/