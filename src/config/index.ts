import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

export const configSchema = z.object({
  defaultModel: z.string().min(1).optional()
});

export type KitaiConfig = z.infer<typeof configSchema>;

const explorer = cosmiconfig('kitai');

export const getConfigExplorer = () => explorer;
