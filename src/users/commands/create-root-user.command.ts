export class CreateRootUserCommand {
  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly email?: string,
  ) {}
}

export class CreateRootUserCommandResult {
  constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly userId: number,
  ) {}
}
