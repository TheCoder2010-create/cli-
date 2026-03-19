import type { SupportedModelId } from '../ai/models/index.js';

export interface AppContext {
  readonly cwd: string;
  readonly model: SupportedModelId;
}

export const createAppContext = (cwd: string, model: SupportedModelId): AppContext => ({
  cwd,
  model
});

export * from './scanner.js';
export * from './session.js';
