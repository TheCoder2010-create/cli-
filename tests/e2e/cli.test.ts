import { describe, expect, it } from 'vitest';

import { buildProgram } from '../../src/index.js';

describe('buildProgram', () => {
  it('registers the doctor command', () => {
    const program = buildProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toContain('doctor');
  });
});
