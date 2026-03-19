import { describe, expect, it } from 'vitest';

import {
  createSessionMemory,
  withAcceptedPlanMemory,
  withCommandOutcomeMemory,
  withPromptMemory
} from '../../src/context/session.js';

describe('session memory helpers', () => {
  it('keeps useful prompt, accepted-plan, and command-outcome history', () => {
    const initial = createSessionMemory();
    const withPrompt = withPromptMemory(initial, 'Inspect the Kitfile.', '2026-03-19T00:00:00.000Z');
    const withPlan = withAcceptedPlanMemory(
      withPrompt,
      {
        summary: 'Review the local workspace.',
        steps: ['Scan files', 'Inspect config'],
        acceptedAt: '2026-03-19T00:01:00.000Z'
      }
    );
    const withOutcome = withCommandOutcomeMemory(
      withPlan,
      {
        command: 'rg --files .',
        exitCode: 0,
        summary: 'Workspace listed successfully.',
        recordedAt: '2026-03-19T00:02:00.000Z'
      }
    );

    expect(withOutcome.priorPrompts).toHaveLength(1);
    expect(withOutcome.acceptedPlans[0]?.steps).toEqual(['Scan files', 'Inspect config']);
    expect(withOutcome.recentCommandOutcomes[0]?.outcome).toBe('success');
  });
});
