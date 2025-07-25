export class LoginUserCommand {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly userAgent?: string,
    public readonly ip?: string,
  ) {}
}
