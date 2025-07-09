export class RootUserCreatedEvent {
  constructor(
    public readonly userId: number,
    public readonly username: string,
    public readonly pemKey: string,
  ) {}
}
