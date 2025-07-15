export class ResetRootPasswordCommand {
  constructor(
    public readonly pemContent: string,
    public readonly newPassword: string,
    public readonly signature: string, // Ed25519 서명 추가
  ) {}
}