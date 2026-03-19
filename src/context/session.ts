export interface SessionPromptMemory {
  readonly prompt: string;
  readonly recordedAt: string;
}

export interface AcceptedPlanMemory {
  readonly summary: string;
  readonly steps: readonly string[];
  readonly acceptedAt: string;
}

export interface CommandOutcomeMemory {
  readonly command: string;
  readonly exitCode: number;
  readonly outcome: 'success' | 'failure';
  readonly recordedAt: string;
  readonly summary: string;
}

export interface SessionMemory {
  readonly priorPrompts: readonly SessionPromptMemory[];
  readonly acceptedPlans: readonly AcceptedPlanMemory[];
  readonly recentCommandOutcomes: readonly CommandOutcomeMemory[];
}

export interface SessionMemoryOptions {
  readonly maxPriorPrompts?: number;
  readonly maxAcceptedPlans?: number;
  readonly maxRecentCommandOutcomes?: number;
}

const defaultLimits: Required<SessionMemoryOptions> = {
  maxPriorPrompts: 6,
  maxAcceptedPlans: 4,
  maxRecentCommandOutcomes: 6
};

const trimToLimit = <T>(items: readonly T[], limit: number): readonly T[] =>
  items.slice(Math.max(items.length - limit, 0));

export const createSessionMemory = (): SessionMemory => ({
  priorPrompts: [],
  acceptedPlans: [],
  recentCommandOutcomes: []
});

export const withPromptMemory = (
  memory: SessionMemory,
  prompt: string,
  recordedAt = new Date().toISOString(),
  options: SessionMemoryOptions = {}
): SessionMemory => ({
  ...memory,
  priorPrompts: trimToLimit(
    [...memory.priorPrompts, { prompt, recordedAt }],
    options.maxPriorPrompts ?? defaultLimits.maxPriorPrompts
  )
});

export const withAcceptedPlanMemory = (
  memory: SessionMemory,
  acceptedPlan: Omit<AcceptedPlanMemory, 'acceptedAt'> & { readonly acceptedAt?: string },
  options: SessionMemoryOptions = {}
): SessionMemory => ({
  ...memory,
  acceptedPlans: trimToLimit(
    [
      ...memory.acceptedPlans,
      {
        summary: acceptedPlan.summary,
        steps: acceptedPlan.steps,
        acceptedAt: acceptedPlan.acceptedAt ?? new Date().toISOString()
      }
    ],
    options.maxAcceptedPlans ?? defaultLimits.maxAcceptedPlans
  )
});

export const withCommandOutcomeMemory = (
  memory: SessionMemory,
  commandOutcome: Omit<CommandOutcomeMemory, 'recordedAt' | 'outcome'> & {
    readonly outcome?: CommandOutcomeMemory['outcome'];
    readonly recordedAt?: string;
  },
  options: SessionMemoryOptions = {}
): SessionMemory => ({
  ...memory,
  recentCommandOutcomes: trimToLimit(
    [
      ...memory.recentCommandOutcomes,
      {
        command: commandOutcome.command,
        exitCode: commandOutcome.exitCode,
        outcome: commandOutcome.outcome ?? (commandOutcome.exitCode === 0 ? 'success' : 'failure'),
        recordedAt: commandOutcome.recordedAt ?? new Date().toISOString(),
        summary: commandOutcome.summary
      }
    ],
    options.maxRecentCommandOutcomes ?? defaultLimits.maxRecentCommandOutcomes
  )
});
