import type { ErrorCode } from '@qd/shared'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode | string,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code)
    this.name = 'ApiError'
  }
}

export const unauthorized = (msg?: string) => new ApiError(401, 'unauthorized', msg)
export const forbidden = (code = 'forbidden', msg?: string) => new ApiError(403, code, msg)
export const notFound = (msg = 'Not found') => new ApiError(404, 'not_found', msg)
export const conflict = (code: string, msg?: string) => new ApiError(409, code, msg)
export const tooMany = (msg?: string) => new ApiError(429, 'too_many_attempts', msg)
