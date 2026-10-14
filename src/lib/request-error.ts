/** Expected failures carry a user-facing response instead of a generic server error. */
export class RequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}
