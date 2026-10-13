export class ResumeImportError extends Error {
  status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message);
    this.name = "ResumeImportError";
    this.status = status;
    if (cause) {
      this.cause = cause;
    }
  }
}
