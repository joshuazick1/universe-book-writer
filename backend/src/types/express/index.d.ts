declare namespace Express {
  export interface Request {
    validatedData?: {
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
      headers?: Record<string, unknown>;
    };
    sanitizedData?: {
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
    };
    corsContext?: {
      userAgent?: string;
      referer?: string;
      xForwardedFor?: string;
      ip?: string;
    };
  }
}
