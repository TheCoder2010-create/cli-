import { describe, expect, it } from 'vitest';

import { buildSystemPrompt } from '../../src/ai/system-prompt.js';

describe('buildSystemPrompt', () => {
  it('embeds reference material, context, and JSON contract instructions', () => {
    const prompt = buildSystemPrompt({
      cwd: '/workspace/cli-',
      topLevelFiles: ['package.json', 'src', 'tests'],
      kitfileContent: 'name: demo-kit',
      sessionHistory: [{ role: 'user', content: 'Add an AI planner.' }]
    });

    expect(prompt).toContain('KIT CLI reference material');
    expect(prompt).toContain('Safety rules');
    expect(prompt).toContain('Risk classification rules');
    expect(prompt).toContain('cwd: /workspace/cli-');
    expect(prompt).toContain('package.json, src, tests');
    expect(prompt).toContain('name: demo-kit');
    expect(prompt).toContain('Return JSON only');
  });
});
