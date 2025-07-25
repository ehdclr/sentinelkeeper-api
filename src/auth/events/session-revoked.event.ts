export class SessionRevokedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: number,
    public readonly reason: string,
    public readonly revokedAt: Date,
  ) {}
}
