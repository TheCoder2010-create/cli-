import os from 'node:os';
import path from 'node:path';

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

import { isSupportedModelId, supportedModelIds, type SupportedModelId } from '../ai/models/index.js';

const getConfigPath = (): string => path.join(os.homedir(), '.kitai', 'config.yaml');

const confirmLevelSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine(
    (value) => ['never', 'none', 'off', 'safe', 'auto', 'risky', 'on-risky', 'always', 'strict', 'all'].includes(value),
    'confirmLevel must be one of: never, safe, always.'
  )
  .transform((value) => {
    switch (value) {
      case 'none':
      case 'off':
        return 'never' as const;
      case 'auto':
      case 'risky':
      case 'on-risky':
        return 'safe' as const;
      case 'strict':
      case 'all':
        return 'always' as const;
      default:
        return value as 'never' | 'safe' | 'always';
    }
  });

const modelSchema = z
  .string()
  .trim()
  .refine((value): value is SupportedModelId => isSupportedModelId(value), {
    message: `model must be one of: ${supportedModelIds.join(', ')}`
  });

const defaultRegistrySchema = z
  .string()
  .trim()
  .min(1, 'defaultRegistry must not be empty.')
  .transform((value) => value.replace(/\/+$/, ''));

export const configSchema = z.object({
  model: modelSchema.optional(),
  defaultRegistry: defaultRegistrySchema.optional(),
  confirmLevel: confirmLevelSchema.optional()
});

export type KitaiConfig = z.infer<typeof configSchema>;

const explorer = cosmiconfig('kitai', {
  searchPlaces: ['config.yaml']
});

export const getConfigExplorer = () => explorer;

/**
 * Loads the user configuration from ~/.kitai/config.yaml and validates supported fields.
 */
export const loadConfig = async (): Promise<KitaiConfig> => {
  try {
    const result = await explorer.load(getConfigPath());

    if (!result?.config) {
      return {};
    }

    return configSchema.parse(result.config);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    throw error;
  }
};
