export interface RunOptions {
  readonly command?: string;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly secrets?: readonly string[];
}

export interface RunEvent {
  readonly type: 'stdout' | 'stderr' | 'exit';
  readonly content: string;
  readonly code: number;
}

export type KitErrorCode = 'spawn_error' | 'exit_code';

const redactKnownPatterns = (value: string): string =>
  value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/(?:api[_-]?key|authorization|token|password|secret)\s*[:=]\s*[^\s,;]+/gi, (match) => {
      const [prefix] = match.split(/[:=]/, 1);
      return `${prefix}=[REDACTED]`;
    });

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const maskSecrets = (value: string, secrets: readonly string[] = []): string => {
  if (!value) {
    return value;
  }

  const uniqueSecrets = [...new Set(secrets.filter((secret) => secret.length > 0))];
  const maskedValue = uniqueSecrets.reduce(
    (current, secret) => current.replace(new RegExp(escapeForRegExp(secret), 'g'), '[REDACTED]'),
    value
  );

  return redactKnownPatterns(maskedValue);
};

/**
 * Typed error raised when invoking the external `kit` CLI fails.
 */
export class KitError extends Error {
  public readonly code: KitErrorCode;
  public readonly exitCode: number;
  public readonly command: string;
  public readonly stderr: string;
  public readonly cause?: unknown;

  public constructor(
    code: KitErrorCode,
    message: string,
    options: {
      readonly command: string;
      readonly exitCode: number;
      readonly stderr?: string;
      readonly secrets?: readonly string[];
      readonly cause?: unknown;
    }
  ) {
    const maskedCommand = maskSecrets(options.command, options.secrets);
    const maskedStderr = maskSecrets(options.stderr ?? '', options.secrets);
    super(maskSecrets(message, options.secrets));
    this.name = 'KitError';
    this.code = code;
    this.exitCode = options.exitCode;
    this.command = maskedCommand;
    this.stderr = maskedStderr;
    this.cause = options.cause;
  }
}

export interface ModelKit<TArgs extends readonly string[] = readonly string[]> {
  readonly args: TArgs;
  readonly command: string;
  readonly requiresConfirmation: boolean;
  run(options?: RunOptions): AsyncGenerator<RunEvent>;
}
