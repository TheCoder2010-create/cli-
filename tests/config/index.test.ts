import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let homeDir: string;

beforeEach(async () => {
  vi.resetModules();
  homeDir = await mkdtemp(path.join(os.tmpdir(), 'kitai-home-'));
  vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(homeDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('loads and normalizes ~/.kitai/config.yaml', async () => {
    await mkdir(path.join(homeDir, '.kitai'), { recursive: true });
    await writeFile(
      path.join(homeDir, '.kitai', 'config.yaml'),
      ['model: gpt-5', 'defaultRegistry: https://registry.example.com/', 'confirmLevel: strict'].join('\n'),
      'utf8'
    );

    const { loadConfig } = await import('../../src/config/index.js');
    await expect(loadConfig()).resolves.toEqual({
      model: 'gpt-5',
      defaultRegistry: 'https://registry.example.com',
      confirmLevel: 'always'
    });
  });

  it('returns an empty object when ~/.kitai/config.yaml is missing', async () => {
    const { loadConfig } = await import('../../src/config/index.js');
    await expect(loadConfig()).resolves.toEqual({});
  });
});
