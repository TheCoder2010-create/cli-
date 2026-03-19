export const supportedModelIds = ['claude-sonnet-4-5', 'gpt-5'] as const;

export type SupportedModelId = (typeof supportedModelIds)[number];

export const isSupportedModelId = (value: string): value is SupportedModelId =>
  supportedModelIds.includes(value as SupportedModelId);

export { AIError } from './error.js';
export { callClaude } from './claude.js';
export { callOpenAI } from './openai.js';
