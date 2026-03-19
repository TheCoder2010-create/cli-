import OpenAI from 'openai';

import { Plan, type Plan as PlanType } from '../schema.js';
import { AIError } from './error.js';

const openAIModel = 'gpt-4o';

/**
 * Calls OpenAI GPT-4o to generate a JSON plan and validates the result.
 */
export const callOpenAI = async (
  systemPrompt: string,
  userMessage: string
): Promise<PlanType> => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let rawText: string;

  try {
    const response = await client.chat.completions.create({
      model: openAIModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });

    rawText = response.choices[0]?.message.content?.trim() ?? '';

    if (!rawText) {
      throw new AIError('parse_error', 'OpenAI returned no text content to parse.');
    }
  } catch (error) {
    if (error instanceof AIError) {
      throw error;
    }

    throw new AIError('api_error', 'OpenAI API request failed.', { cause: error });
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    throw new AIError('parse_error', 'OpenAI returned invalid JSON.', { cause: error });
  }

  const validation = Plan.safeParse(parsedJson);

  if (!validation.success) {
    throw new AIError('validation_error', 'OpenAI returned JSON that does not match the Plan schema.', {
      cause: validation.error
    });
  }

  return validation.data;
};
