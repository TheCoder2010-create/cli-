import Anthropic from '@anthropic-ai/sdk';

import { Plan, type Plan as PlanType } from '../schema.js';
import { AIError } from './error.js';

const claudeModel = 'claude-sonnet-4-20250514';

const extractText = (content: unknown): string => {
  if (!Array.isArray(content)) {
    throw new AIError('parse_error', 'Claude returned an unexpected response shape.');
  }

  const combinedText = content
    .flatMap((block) => {
      if (
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'text' &&
        'text' in block &&
        typeof block.text === 'string'
      ) {
        return [block.text];
      }

      return [];
    })
    .join('\n')
    .trim();

  if (!combinedText) {
    throw new AIError('parse_error', 'Claude returned no text content to parse.');
  }

  return combinedText;
};

/**
 * Calls Claude Sonnet to generate a JSON plan and validates the result.
 */
export const callClaude = async (
  systemPrompt: string,
  userMessage: string
): Promise<PlanType> => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let rawText: string;

  try {
    const response = await client.messages.create({
      model: claudeModel,
      max_tokens: 2_000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    rawText = extractText(response.content);
  } catch (error) {
    if (error instanceof AIError) {
      throw error;
    }

    throw new AIError('api_error', 'Claude API request failed.', { cause: error });
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    throw new AIError('parse_error', 'Claude returned invalid JSON.', { cause: error });
  }

  const validation = Plan.safeParse(parsedJson);

  if (!validation.success) {
    throw new AIError('validation_error', 'Claude returned JSON that does not match the Plan schema.', {
      cause: validation.error
    });
  }

  return validation.data;
};
