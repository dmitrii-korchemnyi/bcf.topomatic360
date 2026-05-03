export class BcfUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BcfUserError";
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
