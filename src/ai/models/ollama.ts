import OpenAI from 'openai';

import { Plan, type Plan as PlanType } from '../schema.js';
import { AIError } from './error.js';

const ollamaModel = 'llama3.2'; // Default Ollama model, can be configurable

/**
 * Calls Ollama (via OpenAI-compatible API) to generate a JSON plan and validates the result.
 */
export const callOllama = async (
  systemPrompt: string,
  userMessage: string
): Promise<PlanType> => {
  const client = new OpenAI({
    apiKey: 'ollama', // Ollama doesn't require a real API key
    baseURL: 'http://localhost:11434/v1' // Default Ollama server
  });

  let rawText: string;

  try {
    const response = await client.chat.completions.create({
      model: ollamaModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    });

    rawText = response.choices[0]?.message.content?.trim() ?? '';

    if (!rawText) {
      throw new AIError('parse_error', 'Ollama returned no text content to parse.');
    }
  } catch (error) {
    if (error instanceof AIError) {
      throw error;
    }

    throw new AIError('api_error', 'Ollama API request failed. Make sure Ollama is running locally.', { cause: error });
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    throw new AIError('parse_error', 'Ollama returned invalid JSON.', { cause: error });
  }

  const validation = Plan.safeParse(parsedJson);

  if (!validation.success) {
    throw new AIError('validation_error', 'Ollama returned JSON that does not match the Plan schema.', {
      cause: validation.error
    });
  }

  return validation.data;
};