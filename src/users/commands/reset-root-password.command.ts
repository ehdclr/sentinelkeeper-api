export class ResetRootPasswordCommand {
  constructor(
    public readonly pemContent: string,
    public readonly newPassword: string,
  ) {}
}
