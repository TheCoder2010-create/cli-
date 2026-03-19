import { describe, expect, it } from 'vitest';

import { createRootCommand } from '../../src/kit/index.js';

describe('createRootCommand', () => {
  it('configures the CLI metadata', () => {
    const command = createRootCommand();

    expect(command.name()).toBe('kitai');
    expect(command.description()).toContain('AI-assisted');
    expect(command.version()).toBe('0.1.0');
  });
});
