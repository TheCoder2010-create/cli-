import { execa } from 'execa';

import { KitError, maskSecrets, type RunEvent, type RunOptions } from './types.js';

interface StreamRecord {
  readonly type: 'stdout' | 'stderr';
  readonly chunk: string;
}

const createEventQueue = () => {
  const items: RunEvent[] = [];
  const waiters: Array<(result: IteratorResult<RunEvent>) => void> = [];
  let closed = false;

  const push = (event: RunEvent): void => {
    const waiter = waiters.shift();

    if (waiter) {
      waiter({ done: false, value: event });
      return;
    }

    items.push(event);
  };

  const close = (): void => {
    closed = true;

    while (waiters.length > 0) {
      const waiter = waiters.shift();
      waiter?.({ done: true, value: undefined });
    }
  };

  const next = async (): Promise<IteratorResult<RunEvent>> => {
    const event = items.shift();

    if (event) {
      return { done: false, value: event };
    }

    if (closed) {
      return { done: true, value: undefined };
    }

    return await new Promise<IteratorResult<RunEvent>>((resolve) => {
      waiters.push(resolve);
    });
  };

  return { close, next, push };
};

const streamText = async (
  stream: NodeJS.ReadableStream | undefined,
  type: StreamRecord['type'],
  onChunk: (record: StreamRecord) => void
): Promise<void> => {
  if (!stream) {
    return;
  }

  stream.setEncoding('utf8');

  for await (const chunk of stream) {
    if (typeof chunk === 'string' && chunk.length > 0) {
      onChunk({ type, chunk });
    }
  }
};

export async function* runKit(args: readonly string[], options: RunOptions = {}): AsyncGenerator<RunEvent> {
  const secrets = options.secrets ?? [];
  const command = options.command ?? ['kit', ...args].join(' ');

  const subprocess = (() => {
    try {
      return execa('kit', [...args], {
        cwd: options.cwd,
        env: options.env,
        reject: false,
        stderr: 'pipe',
        stdout: 'pipe'
      });
    } catch (error) {
      throw new KitError('spawn_error', `Failed to start ${command}.`, {
        cause: error,
        command,
        exitCode: -1,
        secrets
      });
    }
  })();

  const queue = createEventQueue();
  let stderr = '';

  const pumpStdout = streamText(subprocess.stdout, 'stdout', ({ chunk, type }) => {
    queue.push({
      code: 0,
      content: maskSecrets(chunk, secrets),
      type
    });
  });

  const pumpStderr = streamText(subprocess.stderr, 'stderr', ({ chunk, type }) => {
    const maskedChunk = maskSecrets(chunk, secrets);
    stderr += maskedChunk;
    queue.push({
      code: 0,
      content: maskedChunk,
      type
    });
  });

  const completion = (async (): Promise<number> => {
    try {
      const [{ exitCode }] = await Promise.all([subprocess, pumpStdout, pumpStderr]);
      return exitCode ?? 0;
    } catch (error) {
      throw new KitError('spawn_error', `Failed to start ${command}.`, {
        cause: error,
        command,
        exitCode: -1,
        secrets,
        stderr
      });
    } finally {
      queue.close();
    }
  })();

  for (;;) {
    const result = await queue.next();

    if (result.done) {
      break;
    }

    yield result.value;
  }

  const exitCode = await completion;
  const exitEvent: RunEvent = {
    code: exitCode,
    content: '',
    type: 'exit'
  };

  yield exitEvent;

  if (exitCode !== 0) {
    throw new KitError(`exit_code`, `Command failed with exit code ${exitCode}: ${command}`, {
      command,
      exitCode,
      secrets,
      stderr
    });
  }
}
