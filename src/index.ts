#!/usr/bin/env node
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import React from 'react';
import { render } from 'ink';

import { supportedModelIds } from './ai/models/index.js';
import { getConfigExplorer } from './config/index.js';
import { createAppContext } from './context/index.js';
import { createRootCommand } from './kit/index.js';
import { StatusMessage } from './ui/index.js';

export const buildProgram = () => {
  const program = createRootCommand();

  program
    .command('doctor')
    .description('Show a quick health summary for the local kitai setup.')
    .action(async () => {
      await getConfigExplorer().search();
      const context = createAppContext(process.cwd(), supportedModelIds[0]);
      render(
        React.createElement(StatusMessage, {
          message: `kitai is ready in ${context.cwd} using ${context.model}.`
        })
      );
    });

  return program;
};

export const runCli = async (argv: string[]): Promise<void> => {
  await buildProgram().parseAsync(argv);
};

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (entrypoint === import.meta.url) {
  await runCli(process.argv);
}
