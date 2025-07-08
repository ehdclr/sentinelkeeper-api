export class CreateRootUserCommand {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly email?: string,
  ) {}
}
