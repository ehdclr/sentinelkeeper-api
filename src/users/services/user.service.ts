import { Injectable } from '@nestjs/common';
import { DatabaseConfigService } from '../../database/config/database-config.service';
import { UserHashService } from './user-hash.service';
import {
  CreateUserDto,
  UserResponse,
} from '../../database/schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    private readonly databaseConfigService: DatabaseConfigService,
    private readonly userHashService: UserHashService,
  ) {}

  async createUser(userData: {
    username: string;
    password: string; // 원본 비밀번호
    email?: string;
    isSystemAdmin?: boolean;
  }) {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    const { username, password, email, isSystemAdmin = false } = userData;

    // 비밀번호 해시화
    const passwordHash = await this.userHashService.hashPassword(password);

    switch (config.type) {
      case 'sqlite':
        const stmt = connection.raw.prepare(
          'INSERT INTO users (username, password_hash, email, is_system_admin) VALUES (?, ?, ?, ?)',
        );
        const result = stmt.run(
          username,
          passwordHash,
          email,
          isSystemAdmin ? 1 : 0,
        );
        return { id: result.lastInsertRowid, username, email, isSystemAdmin };

      case 'postgres':
        const pgResult = await connection.raw.query(
          'INSERT INTO users (username, password_hash, email, is_system_admin) VALUES ($1, $2, $3, $4) RETURNING *',
          [username, passwordHash, email, isSystemAdmin],
        );
        return pgResult[0];

      case 'mysql':
        const [mysqlResult] = await connection.raw.execute(
          'INSERT INTO users (username, password_hash, email, is_system_admin) VALUES (?, ?, ?, ?)',
          [username, passwordHash, email, isSystemAdmin ? 1 : 0],
        );
        return { id: mysqlResult.insertId, username, email, isSystemAdmin };
    }
  }

  async countSystemAdmins(): Promise<number> {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    switch (config.type) {
      case 'sqlite':
        const result = connection.raw
          .prepare(
            'SELECT COUNT(*) as count FROM users WHERE is_system_admin = 1',
          )
          .get();
        return result.count;

      case 'postgres':
        const pgResult = await connection.raw.query(
          'SELECT COUNT(*) as count FROM users WHERE is_system_admin = true',
        );
        return parseInt(pgResult[0].count);

      case 'mysql':
        const [rows] = await connection.raw.execute(
          'SELECT COUNT(*) as count FROM users WHERE is_system_admin = 1',
        );
        return rows[0].count;
    }
  }

  async findUserByUsername(username: string) {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    switch (config.type) {
      case 'sqlite':
        const stmt = connection.raw.prepare(
          'SELECT * FROM users WHERE username = ?',
        );
        return stmt.get(username);

      case 'postgres':
        const pgResult = await connection.raw.query(
          'SELECT * FROM users WHERE username = $1',
          [username],
        );
        return pgResult[0] || null;

      case 'mysql':
        const [rows] = await connection.raw.execute(
          'SELECT * FROM users WHERE username = ?',
          [username],
        );
        return rows[0] || null;
    }
  }

  async verifyPassword(username: string, password: string): Promise<boolean> {
    const user = await this.findUserByUsername(username);
    if (!user) return false;

    return this.userHashService.comparePassword(password, user.password_hash);
  }

  private async createConnection(config: any) {
    // DatabaseConfigService의 createTestConnection 메서드 활용
    return await this.databaseConfigService['createTestConnection'](config);
  }

  private mapToUserResponse(dbUser: any): UserResponse {
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      isActive: dbUser.is_active,
      isSystemAdmin: dbUser.is_system_admin,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }

  async findUserById(id: number): Promise<UserResponse | null> {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    const [user] = await connection.raw.execute(
      'SELECT * FROM users WHERE id = ?',
      [id],
    );

    if (!user) return null;

    return this.mapToUserResponse(user[0]);
  }

  async updateUser(
    id: number,
    updates: Partial<CreateUserDto>,
  ): Promise<UserResponse | null> {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    const [user] = await connection.raw.execute(
      'UPDATE users SET username = ?, email = ?, is_system_admin = ?, updated_at = ? WHERE id = ? RETURNING *',
      [updates.username, updates.email, updates.isSystemAdmin, new Date(), id],
    );

    if (!user) return null;

    return this.mapToUserResponse(user[0]);
  }

  async deleteUser(id: number): Promise<boolean> {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    const result = await connection.raw.execute(
      'DELETE FROM users WHERE id = ?',
      [id],
    );

    return result.rowCount > 0;
  }
}
