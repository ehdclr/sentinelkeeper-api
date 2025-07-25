export class RevokeSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly reason: 'logout' | 'expired' | 'security' = 'logout',
  ) {}
}
