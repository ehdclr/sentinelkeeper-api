export class SessionEntity {
  constructor(
    public readonly id: string,
    public readonly userId: number,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
    public readonly lastActivityAt: Date,
    public readonly userAgent?: string,
    public readonly ip?: string,
    public readonly isRevoked: boolean = false,
  ) {}

  static create(
    userId: number,
    durationHours: number = 24,
    userAgent?: string,
    ip?: string,
  ): SessionEntity {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    return new SessionEntity(
      require('crypto').randomUUID(),
      userId,
      expiresAt,
      now,
      now,
      userAgent,
      ip,
    );
  }

  isValid(): boolean {
    return !this.isRevoked && new Date() < this.expiresAt;
  }

  updateActivity(): SessionEntity {
    return new SessionEntity(
      this.id,
      this.userId,
      this.expiresAt,
      this.createdAt,
      new Date(),
      this.userAgent,
      this.ip,
      this.isRevoked,
    );
  }
}
