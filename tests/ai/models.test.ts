import { describe, expect, it } from 'vitest';

import { isSupportedModelId, supportedModelIds } from '../../src/ai/models/index.js';

describe('supportedModelIds', () => {
  it('includes the default model identifiers', () => {
    expect(supportedModelIds).toContain('gpt-5');
    expect(supportedModelIds).toContain('claude-sonnet-4-5');
  });

  it('validates model identifiers', () => {
    expect(isSupportedModelId('gpt-5')).toBe(true);
    expect(isSupportedModelId('unknown-model')).toBe(false);
  });
});
