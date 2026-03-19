import { Command } from 'commander';

export const createRootCommand = (): Command =>
  new Command()
    .name('kitai')
    .description('Bootstrap and orchestrate AI-assisted project kits.')
    .version('0.1.0');
