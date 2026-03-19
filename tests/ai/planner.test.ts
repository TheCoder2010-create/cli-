import { beforeEach, describe, expect, it, vi } from 'vitest';

const callClaude = vi.fn();
const callOpenAI = vi.fn();

vi.mock('../../src/ai/models/claude.js', () => ({
  callClaude
}));

vi.mock('../../src/ai/models/openai.js', () => ({
  callOpenAI
}));

describe('createPlan', () => {
  beforeEach(() => {
    vi.resetModules();
    callClaude.mockReset();
    callOpenAI.mockReset();
    delete process.env.KITAI_MODEL;
  });

  it('defaults to the Claude adapter', async () => {
    callClaude.mockResolvedValue({
      summary: 'Claude plan',
      overallRisk: 'low',
      steps: [
        {
          title: 'Inspect',
          description: 'Inspect the repo.',
          command: 'rg --files .',
          risk: 'low',
          requiresConfirmation: false
        }
      ],
      warnings: []
    });

    const { createPlan } = await import('../../src/ai/planner.js');
    const result = await createPlan({
      context: {
        cwd: '/workspace/cli-',
        topLevelFiles: ['src'],
        kitfileContent: null,
        sessionHistory: []
      },
      userMessage: 'Plan the next change.'
    });

    expect(callClaude).toHaveBeenCalledTimes(1);
    expect(callOpenAI).not.toHaveBeenCalled();
    expect(result.summary).toBe('Claude plan');
  });

  it('routes to the OpenAI adapter when KITAI_MODEL requests it', async () => {
    process.env.KITAI_MODEL = 'gpt-4o';
    callOpenAI.mockResolvedValue({
      summary: 'OpenAI plan',
      overallRisk: 'low',
      steps: [
        {
          title: 'Inspect',
          description: 'Inspect the repo.',
          command: null,
          risk: 'low',
          requiresConfirmation: false
        }
      ],
      warnings: []
    });

    const { createPlan } = await import('../../src/ai/planner.js');
    const result = await createPlan({
      context: {
        cwd: '/workspace/cli-',
        topLevelFiles: ['src'],
        kitfileContent: null,
        sessionHistory: []
      },
      userMessage: 'Plan the next change.'
    });

    expect(callOpenAI).toHaveBeenCalledTimes(1);
    expect(callClaude).not.toHaveBeenCalled();
    expect(result.summary).toBe('OpenAI plan');
  });
});
