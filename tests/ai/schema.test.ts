import { describe, expect, it } from 'vitest';

import { Plan } from '../../src/ai/schema.js';

describe('Plan schema', () => {
  it('accepts a valid plan payload', () => {
    const result = Plan.parse({
      summary: 'Inspect the workspace and update the Kitfile.',
      overallRisk: 'medium',
      steps: [
        {
          title: 'Review files',
          description: 'Inspect the current project files before making changes.',
          command: 'rg --files .',
          risk: 'low',
          requiresConfirmation: false
        }
      ],
      warnings: ['Double-check the generated Kitfile changes before applying them.']
    });

    expect(result.overallRisk).toBe('medium');
    expect(result.steps).toHaveLength(1);
  });

  it('rejects invalid risk levels', () => {
    const result = Plan.safeParse({
      summary: 'Invalid plan',
      overallRisk: 'critical',
      steps: [],
      warnings: []
    });

    expect(result.success).toBe(false);
  });
});
