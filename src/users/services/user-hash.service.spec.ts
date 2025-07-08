import { Test, TestingModule } from '@nestjs/testing';
import { UserHashService } from './user-hash.service';

describe('UserHashService', () => {
  let service: UserHashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserHashService],
    }).compile();

    service = module.get<UserHashService>(UserHashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt가 다르므로 해시도 다름
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hash = await service.hashPassword(password);

      const result = await service.comparePassword(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });
}); 