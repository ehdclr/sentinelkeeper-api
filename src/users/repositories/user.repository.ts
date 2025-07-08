import { Injectable } from '@nestjs/common';
import { DatabaseConfigService } from '../../database/config/database-config.service';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(private readonly databaseConfigService: DatabaseConfigService) {}

  async create(userData: {
    username: string;
    passwordHash: string;
    email?: string;
    isSystemAdmin?: boolean;
  }): Promise<User> {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    const { username, passwordHash, email, isSystemAdmin = false } = userData;

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
        return this.findById(result.lastInsertRowid);

      case 'postgres':
        const pgResult = await connection.raw.query(
          'INSERT INTO users (username, password_hash, email, is_system_admin) VALUES ($1, $2, $3, $4) RETURNING *',
          [username, passwordHash, email, isSystemAdmin],
        );
        return this.mapToUser(pgResult[0]);

      case 'mysql':
        const [mysqlResult] = await connection.raw.execute(
          'INSERT INTO users (username, password_hash, email, is_system_admin) VALUES (?, ?, ?, ?)',
          [username, passwordHash, email, isSystemAdmin ? 1 : 0],
        );
        return this.findById(mysqlResult.insertId);
    }
  }

  async findById(id: number): Promise<User | null> {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    switch (config.type) {
      case 'sqlite':
        const stmt = connection.raw.prepare('SELECT * FROM users WHERE id = ?');
        const result = stmt.get(id);
        return result ? this.mapToUser(result) : null;

      case 'postgres':
        const pgResult = await connection.raw.query(
          'SELECT * FROM users WHERE id = $1',
          [id],
        );
        return pgResult[0] ? this.mapToUser(pgResult[0]) : null;

      case 'mysql':
        const [rows] = await connection.raw.execute(
          'SELECT * FROM users WHERE id = ?',
          [id],
        );
        return rows[0] ? this.mapToUser(rows[0]) : null;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    const config = this.databaseConfigService.getConfig();
    const connection = await this.createConnection(config);

    switch (config.type) {
      case 'sqlite':
        const stmt = connection.raw.prepare(
          'SELECT * FROM users WHERE username = ?',
        );
        const result = stmt.get(username);
        return result ? this.mapToUser(result) : null;

      case 'postgres':
        const pgResult = await connection.raw.query(
          'SELECT * FROM users WHERE username = $1',
          [username],
        );
        return pgResult[0] ? this.mapToUser(pgResult[0]) : null;

      case 'mysql':
        const [rows] = await connection.raw.execute(
          'SELECT * FROM users WHERE username = ?',
          [username],
        );
        return rows[0] ? this.mapToUser(rows[0]) : null;
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

  private mapToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      username: dbUser.username,
      passwordHash: dbUser.password_hash,
      email: dbUser.email,
      isActive: dbUser.is_active,
      isSystemAdmin: dbUser.is_system_admin,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }

  private async createConnection(config: any) {
    return await this.databaseConfigService['createTestConnection'](config);
  }
}
