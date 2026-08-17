export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function mapErrorToHttp(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        ok: false,
        message: error.message,
        ...(error.code ? { error_code: error.code } : {})
      }
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      message: error instanceof Error ? error.message : "服务暂时不可用。"
    }
  };
}