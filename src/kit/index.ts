import { Command } from 'commander';

import { runKit } from './runner.js';
import type { ModelKit, RunOptions } from './types.js';

const shellQuote = (value: string): string => {
  if (value.length === 0) {
    return "''";
  }

  return /[^A-Za-z0-9_./:-]/.test(value) ? `'${value.replace(/'/g, `'"'"'`)}'` : value;
};

const buildKitArgs = <TArgs extends readonly string[]>(subcommand: string, args: TArgs): readonly [string, ...TArgs] =>
  [subcommand, ...args];

export const buildKitCommand = (args: readonly string[]): string => ['kit', ...args].map(shellQuote).join(' ');

const createKitCommand = <TArgs extends readonly string[]>(
  subcommand: string,
  args: TArgs,
  requiresConfirmation: boolean
): ModelKit<readonly [string, ...TArgs]> => {
  const fullArgs = buildKitArgs(subcommand, args);
  const command = buildKitCommand(fullArgs);

  return {
    args: fullArgs,
    command,
    requiresConfirmation,
    run: (options: RunOptions = {}) => runKit(fullArgs, { ...options, command })
  };
};

export const kitInit = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['init', ...TArgs]> =>
  createKitCommand('init', args, true);

export const kitPack = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['pack', ...TArgs]> =>
  createKitCommand('pack', args, true);

export const kitPush = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['push', ...TArgs]> =>
  createKitCommand('push', args, true);

export const kitPull = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['pull', ...TArgs]> =>
  createKitCommand('pull', args, true);

export const kitUnpack = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['unpack', ...TArgs]> =>
  createKitCommand('unpack', args, true);

export const kitImport = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['import', ...TArgs]> =>
  createKitCommand('import', args, true);

export const kitDev = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['dev', ...TArgs]> =>
  createKitCommand('dev', args, true);

export const kitList = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['list', ...TArgs]> =>
  createKitCommand('list', args, false);

export const kitLogin = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['login', ...TArgs]> =>
  createKitCommand('login', args, true);

export const kitTag = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['tag', ...TArgs]> =>
  createKitCommand('tag', args, true);

export const kitVersion = <TArgs extends readonly string[]>(...args: TArgs): ModelKit<readonly ['version', ...TArgs]> =>
  createKitCommand('version', args, false);

export { runKit } from './runner.js';
export type { ModelKit, RunEvent, RunOptions } from './types.js';
export { KitError } from './types.js';

export const createRootCommand = (): Command =>
  new Command()
    .name('kitai')
    .description('Bootstrap and orchestrate AI-assisted project kits.')
    .version('0.1.0');
