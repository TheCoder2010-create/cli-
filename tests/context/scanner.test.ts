import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { scanContext } from '../../src/context/scanner.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => import('node:fs/promises').then(({ rm }) => rm(dir, { recursive: true, force: true }))));
  tempDirs.length = 0;
});

describe('scanContext', () => {
  it('collects top-level files, directories, Kitfile data, and typed assets', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'kitai-context-'));
    tempDirs.push(cwd);

    await mkdir(path.join(cwd, 'src'));
    await writeFile(path.join(cwd, 'Kitfile'), 'name: demo\nregistry: local\n', 'utf8');
    await writeFile(path.join(cwd, 'model.gguf'), '', 'utf8');
    await writeFile(path.join(cwd, 'dataset.jsonl'), '', 'utf8');
    await writeFile(path.join(cwd, 'notes.txt'), '', 'utf8');

    const context = await scanContext(cwd);

    expect(context.topLevelNames).toEqual(['dataset.jsonl', 'Kitfile', 'model.gguf', 'notes.txt', 'src']);
    expect(context.topLevelDirectories.map((entry) => entry.name)).toEqual(['src']);
    expect(context.modelFiles.map((entry) => entry.name)).toEqual(['model.gguf']);
    expect(context.datasetFiles.map((entry) => entry.name)).toEqual(['dataset.jsonl']);
    expect(context.kitfile?.data).toMatchObject({ name: 'demo', registry: 'local' });
    expect(context.kitfile?.parseError).toBeNull();
  });

  it('captures Kitfile parse errors without throwing', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'kitai-context-'));
    tempDirs.push(cwd);

    await writeFile(path.join(cwd, 'Kitfile'), 'name: [broken', 'utf8');

    const context = await scanContext(cwd);

    expect(context.kitfile?.data).toBeNull();
    expect(context.kitfile?.parseError).toContain('unexpected end of the stream');
  });
});
