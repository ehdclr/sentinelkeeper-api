export class UserLoggedInEvent {
  constructor(
    public readonly userId: number,
    public readonly username: string,
    public readonly sessionId: string,
    public readonly loginTime: Date,
    public readonly ip?: string,
    public readonly userAgent?: string,
  ) {}
}
