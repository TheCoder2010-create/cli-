export type AIErrorCode = 'api_error' | 'parse_error' | 'validation_error';

const redactSecrets = (value: string): string =>
  value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/(?:api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');

/**
 * A typed error raised when model calls or plan validation fail.
 */
export class AIError extends Error {
  public readonly code: AIErrorCode;
  public override readonly cause?: unknown;

  public constructor(code: AIErrorCode, message: string, options?: { cause?: unknown }) {
    super(redactSecrets(message));
    this.name = 'AIError';
    this.code = code;
    this.cause = options?.cause;
  }
}
