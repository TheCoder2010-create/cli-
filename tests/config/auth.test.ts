import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let homeDir: string;

beforeEach(async () => {
  vi.resetModules();
  homeDir = await mkdtemp(path.join(os.tmpdir(), 'kitai-auth-'));
  vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(homeDir, { recursive: true, force: true });
});

describe('credential helpers', () => {
  it('falls back to a plaintext credential file and masks logged values', async () => {
    const warnings: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((message?: unknown) => {
      warnings.push(String(message));
    });

    const { getCredential, saveCredential } = await import('../../src/config/auth.js');

    await saveCredential('openai', 'super-secret-token');
    await expect(getCredential('openai')).resolves.toBe('super-secret-token');

    const stored = await readFile(path.join(homeDir, '.kitai', 'credentials'), 'utf8');

    expect(JSON.parse(stored)).toMatchObject({ openai: 'super-secret-token' });
    expect(warnings.some((warning) => warning.includes('plaintext fallback'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('super-secret-token'))).toBe(false);
    expect(warnings.some((warning) => warning.includes('su***en'))).toBe(true);
  });
});
