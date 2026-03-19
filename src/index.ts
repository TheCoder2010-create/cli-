import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { execa } from 'execa';
import React from 'react';
import { render } from 'ink';

import type { SupportedModelId } from './ai/models/index.js';
import { supportedModelIds } from './ai/models/index.js';
import { loadConfig } from './config/index.js';
import { createRootCommand } from './kit/index.js';
import { App } from './ui/index.js';

process.title = 'kitai';

const installGuidance = [
  'The `kit` CLI is required but was not found on PATH.',
  'Install it first, then re-run this command.',
  'Example: visit the Kit CLI installation docs or add the `kit` binary to your PATH.'
].join('\n');

const ensureKitIsInstalled = async (): Promise<void> => {
  try {
    await execa('kit', ['version'], { stdout: 'ignore', stderr: 'ignore' });
  } catch {
    console.error(installGuidance);
    process.exitCode = 1;
    throw new Error('kit_missing');
  }
};

const normalizeModel = (value: string | undefined, fallback: SupportedModelId): SupportedModelId =>
  supportedModelIds.includes(value as SupportedModelId) ? (value as SupportedModelId) : fallback;

const runInkApp = async (options: { readonly intent?: string; readonly dryRun?: boolean; readonly model?: string }): Promise<void> => {
  const config = await loadConfig();
  const instance = render(
    React.createElement(App, {
      cwd: process.cwd(),
      dryRun: options.dryRun ?? false,
      intent: options.intent,
      model: normalizeModel(options.model ?? config.model, supportedModelIds[0])
    })
  );

  await instance.waitUntilExit();
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

const explainCommand = (command: string): string => {
  const normalized = command.trim();
  const mutating = /(\b(init|pack|push|pull|unpack|import|dev|login|tag|rm|mv|cp|chmod|chown|sed -i)\b)/.test(normalized);
  const highRisk = /(\brm -rf\b|\bdd\b|\bmkfs\b|\bchmod 777\b)/.test(normalized);

  return [
    `Command: ${normalized}`,
    `Mutation risk: ${highRisk ? 'high' : mutating ? 'medium' : 'low'}`,
    `Confirmation required: ${mutating || highRisk ? 'yes' : 'recommended'}`,
    highRisk
      ? 'This command looks destructive or irreversible. Do not run it without carefully reviewing the target.'
      : mutating
        ? 'This command appears to modify the workspace or a remote target.'
        : 'This command appears read-only or informational.'
  ].join('\n');
};

export const buildProgram = () => {
  const program = createRootCommand();

  program
    .argument('[intent...]', 'Intent to plan and execute immediately in single-shot mode.')
    .option('--dry-run', 'Generate a plan without executing commands.', false)
    .option('--model <n>', `Planner model (${supportedModelIds.join(', ')})`)
    .action(async (intentParts: string[], options: { dryRun?: boolean; model?: string }) => {
      const intent = intentParts.join(' ').trim();
      await runInkApp({
        dryRun: options.dryRun,
        intent: intent.length > 0 ? intent : undefined,
        model: options.model
      });
    });

  program
    .command('explain')
    .argument('<command>', 'Command string to classify and explain.')
    .description('Explain whether a shell command is likely read-only or mutating.')
    .action(async (command: string) => {
      process.stdout.write(`${explainCommand(command)}\n`);
    });

  program
    .command('config')
    .description('Print the resolved ~/.kitai/config.yaml settings.')
    .action(async () => {
      process.stdout.write(`${formatJson(await loadConfig())}\n`);
    });


  program
    .command('doctor')
    .description('Show a quick health summary for the local kitai setup.')
    .action(async () => {
      const config = await loadConfig();
      process.stdout.write(`kitai is ready in ${process.cwd()} using ${(config.model ?? supportedModelIds[0])}.\n`);
    });

  program
    .command('version')
    .description('Print the kitai CLI version.')
    .action(() => {
      process.stdout.write(`${program.version()}\n`);
    });

  return program;
};

export const runCli = async (argv: string[]): Promise<void> => {
  try {
    await ensureKitIsInstalled();
  } catch (error) {
    if (error instanceof Error && error.message === 'kit_missing') {
      return;
    }
    throw error;
  }

  await buildProgram().parseAsync(argv);
};

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (entrypoint === import.meta.url) {
  await runCli(process.argv);
}
