import { callClaude } from './models/claude.js';
import { callOpenAI } from './models/openai.js';
import { Plan, type Plan as PlanType } from './schema.js';
import { buildSystemPrompt, type SystemPromptContext } from './system-prompt.js';

export interface PlannerRequest {
  readonly context: SystemPromptContext;
  readonly userMessage: string;
}

type PlannerModel = 'claude' | 'openai';

const resolvePlannerModel = (value: string | undefined): PlannerModel => {
  switch (value?.trim().toLowerCase()) {
    case 'openai':
    case 'gpt-4o':
      return 'openai';
    case 'claude':
    case 'claude-sonnet-4-20250514':
    case undefined:
    case '':
      return 'claude';
    default:
      return 'claude';
  }
};

/**
 * Generates a validated plan using the configured model adapter.
 */
export const createPlan = async ({ context, userMessage }: PlannerRequest): Promise<PlanType> => {
  const systemPrompt = buildSystemPrompt(context);
  const model = resolvePlannerModel(process.env.KITAI_MODEL);

  const result = model === 'openai'
    ? await callOpenAI(systemPrompt, userMessage)
    : await callClaude(systemPrompt, userMessage);

  return Plan.parse(result);
};
