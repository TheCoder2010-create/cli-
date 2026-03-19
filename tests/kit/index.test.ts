import { describe, expect, it } from 'vitest';

import { buildKitCommand, kitInit, kitList, kitVersion } from '../../src/kit/index.js';
import { KitError, maskSecrets } from '../../src/kit/types.js';

describe('kit command builders', () => {
  it('marks only read-only commands as self-authorized', () => {
    expect(kitList('--json').requiresConfirmation).toBe(false);
    expect(kitVersion().requiresConfirmation).toBe(false);
    expect(kitInit('demo').requiresConfirmation).toBe(true);
  });

  it('builds display commands centrally with shell quoting', () => {
    const command = kitInit('demo project', '--token=shh-secret').command;

    expect(command).toBe("kit init 'demo project' --token=shh-secret");
    expect(buildKitCommand(['push', 'my kit'])).toBe("kit push 'my kit'");
  });
});

describe('kit error masking', () => {
  it('redacts explicit secrets and known token patterns', () => {
    expect(maskSecrets('token=abcd sk-test-123', ['abcd'])).toBe('token=[REDACTED] [REDACTED]');

    const error = new KitError('exit_code', 'Failed token=abcd', {
      command: 'kit push --token=abcd',
      exitCode: 1,
      secrets: ['abcd'],
      stderr: 'authorization: abcd'
    });

    expect(error.command).toBe('kit push --token=[REDACTED]');
    expect(error.stderr).toBe('authorization=[REDACTED]');
    expect(error.message).toBe('Failed token=[REDACTED]');
  });
});
