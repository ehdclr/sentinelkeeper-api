export class SessionCreatedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: number,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
  ) {}
}
