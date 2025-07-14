// src/users/repositories/user.repository.ts
import { Injectable } from '@nestjs/common';
import { DatabaseConfigService } from '../../database/services/database-config.service';
import { eq, count, sql } from 'drizzle-orm';
import { getUsersTable } from '../schemas/user.schema'; // 스키마 파일 경로에 맞게 수정
import { DatabaseConfig } from '@/database/types/database.type';

@Injectable()
export class UserRepository {
  constructor(private readonly databaseConfigService: DatabaseConfigService) {}

  private async getDb() {
    return await this.databaseConfigService.getDb();
  }

  // 현재 DB 타입에 맞는 users 테이블 스키마 가져오기
  private getUsersSchema() {
    const config = this.databaseConfigService.getConfig();
    return getUsersTable(config.type);
  }

  async create(userData: any) {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.insert(users).values(userData).returning();
  }

  // 메서드명을 일관성 있게 수정
  async findByUsername(username: string) {
    const db = await this.getDb();
    const users = this.getUsersSchema();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return result[0];
  }

  async findById(id: number) {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.select().from(users).where(eq(users.id, id)).limit(1);
  }

  async getUserCount() {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.select({ count: count() }).from(users);
  }

  async updateUser(id: number, updateData: any) {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.update(users).set(updateData).where(eq(users.id, id)).returning();
  }

  async deleteUser(id: number) {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.delete(users).where(eq(users.id, id)).returning();
  }

  async findAllUsers(limit: number = 10, offset: number = 0) {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.select().from(users).limit(limit).offset(offset);
  }

  async findActiveUsers() {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.select().from(users).where(eq(users.isActive, true));
  }

  async findSystemAdmins() {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db.select().from(users).where(eq(users.isSystemRoot, true));
  }

  // 특정 DB에서만 작동하는 메서드 예시
  async findUsersByEmailDomain(domain: string) {
    const db = await this.getDb();
    const users = this.getUsersSchema();
    const config = this.databaseConfigService.getConfig();

    // DB별로 다른 쿼리 방식 사용 가능
    switch (config.type as string) {
      case 'postgres':
        return db
          .select()
          .from(users)
          .where(sql`${users.email} LIKE ${`%@${domain}`}`);
      case 'sqlite':
        return db
          .select()
          .from(users)
          .where(sql`${users.email} LIKE ${`%@${domain}`}`);

      case 'mysql':
        return db
          .select()
          .from(users)
          .where(sql`${users.email} LIKE ${`%@${domain}`}`);

      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  async findByRecoveryKeyId(recoveryKeyId: string) {
    const db = await this.getDb();
    const users = this.getUsersSchema();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.recoveryKeyId, recoveryKeyId))
      .limit(1);

    return result[0];
  }

  async updatePassword(id: number, hashedPassword: string) {
    const db = await this.getDb();
    const users = this.getUsersSchema();

    return db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
  }
}
