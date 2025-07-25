import { Injectable } from '@nestjs/common';
import { SessionEntity } from '../entities/session.entity';

@Injectable()
export class AuthRepository {
  private sessions = new Map<string, SessionEntity>(); // 실제로는 DB 사용

  async save(session: SessionEntity): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findById(sessionId: string): Promise<SessionEntity | null> {
    return this.sessions.get(sessionId) || null;
  }

  async findByUserId(userId: number): Promise<SessionEntity[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId,
    );
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async revokeUserSessions(userId: number): Promise<void> {
    const userSessions = await this.findByUserId(userId);
    userSessions.forEach((session) => {
      const revokedSession = new SessionEntity(
        session.id,
        session.userId,
        session.expiresAt,
        session.createdAt,
        session.lastActivityAt,
        session.userAgent,
        session.ip,
        true, // revoked
      );
      this.sessions.set(session.id, revokedSession);
    });
  }
}
