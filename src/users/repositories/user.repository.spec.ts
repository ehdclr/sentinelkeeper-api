import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { DatabaseConfigService } from '../../database/config/database-config.service';

describe('UserRepository', () => {
  let repository: UserRepository;
  let databaseConfigService: jest.Mocked<DatabaseConfigService>;

  const mockConnection = {
    raw: {
      prepare: jest.fn(),
      query: jest.fn(),
      execute: jest.fn(),
    },
  };

  beforeEach(async () => {
    const mockDatabaseConfigService = {
      getConfig: jest.fn(),
      createTestConnection: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: DatabaseConfigService,
          useValue: mockDatabaseConfigService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    databaseConfigService = module.get(DatabaseConfigService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create user with SQLite', async () => {
      const mockConfig = { type: 'sqlite' };
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1 }),
      };

      databaseConfigService.getConfig.mockReturnValue(mockConfig);
      databaseConfigService.createTestConnection.mockResolvedValue(mockConnection);
      mockConnection.raw.prepare.mockReturnValue(mockStmt);
      jest.spyOn(repository as any, 'findById').mockResolvedValue({
        id: 1,
        username: 'testuser',
        passwordHash: 'hashedpassword',
        email: 'test@example.com',
        isActive: true,
        isSystemAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.create({
        username: 'testuser',
        passwordHash: 'hashedpassword',
        email: 'test@example.com',
        isSystemAdmin: true,
      });

      expect(mockStmt.run).toHaveBeenCalledWith(
        'testuser',
        'hashedpassword',
        'test@example.com',
        1,
      );
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });

  describe('countSystemAdmins', () => {
    it('should count system admins correctly', async () => {
      const mockConfig = { type: 'sqlite' };
      const mockStmt = {
        get: jest.fn().mockReturnValue({ count: 2 }),
      };

      databaseConfigService.getConfig.mockReturnValue(mockConfig);
      databaseConfigService.createTestConnection.mockResolvedValue(mockConnection);
      mockConnection.raw.prepare.mockReturnValue(mockStmt);

      const result = await repository.countSystemAdmins();

      expect(result).toBe(2);
      expect(mockConnection.raw.prepare).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users WHERE is_system_admin = 1',
      );
    });
  });
}); 