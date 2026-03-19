import { spawn } from 'node:child_process';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import { createPlan } from '../ai/planner.js';
import type { Plan } from '../ai/schema.js';
import type { SupportedModelId } from '../ai/models/index.js';
import { supportedModelIds } from '../ai/models/index.js';
import { scanContext } from '../context/scanner.js';
import {
  createSessionMemory,
  withAcceptedPlanMemory,
  withCommandOutcomeMemory,
  withPromptMemory,
  type SessionMemory
} from '../context/session.js';
import { loadConfig } from '../config/index.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';
import { ExecutionView, type ExecutionLogLine } from './ExecutionView.js';
import { PlanView } from './PlanView.js';

export interface ReplProps {
  readonly cwd: string;
  readonly initialIntent?: string;
  readonly dryRun?: boolean;
  readonly model?: SupportedModelId;
  readonly singleShot?: boolean;
}

type ReplPhase = 'input' | 'planning' | 'confirming' | 'executing' | 'done';

interface TranscriptEntry {
  readonly id: string;
  readonly tone: 'system' | 'user' | 'assistant' | 'error';
  readonly message: string;
}

const toneColor: Record<TranscriptEntry['tone'], 'cyan' | 'white' | 'green' | 'red'> = {
  system: 'cyan',
  user: 'white',
  assistant: 'green',
  error: 'red'
};

const isMutatingStep = (step: Plan['steps'][number]): boolean => step.command !== null && (step.requiresConfirmation || step.risk !== 'low');

const makeId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const splitLines = (value: string): string[] => value.split(/\r?\n/).filter((line) => line.length > 0);

const runShellCommand = async (
  command: string,
  onLog: (line: ExecutionLogLine) => void
): Promise<number> => {
  const child = spawn('bash', ['-lc', command], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (chunk: string) => {
    splitLines(chunk).forEach((line) => onLog({ id: makeId(), stream: 'stdout', text: line }));
  });

  child.stderr.on('data', (chunk: string) => {
    splitLines(chunk).forEach((line) => onLog({ id: makeId(), stream: 'stderr', text: line }));
  });

  return await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 0));
  });
};

const buildPlanContext = async (cwd: string, memory: SessionMemory) => {
  const context = await scanContext(cwd);

  return {
    cwd: context.cwd,
    topLevelFiles: context.topLevelNames,
    kitfileContent: context.kitfile?.content ?? null,
    sessionHistory: [],
    priorPrompts: memory.priorPrompts,
    acceptedPlans: memory.acceptedPlans,
    recentCommandOutcomes: memory.recentCommandOutcomes
  };
};

export const Repl = ({ cwd, initialIntent, dryRun = false, model, singleShot = false }: ReplProps): React.JSX.Element => {
  const { exit } = useApp();
  const [phase, setPhase] = useState<ReplPhase>(initialIntent ? 'planning' : 'input');
  const [buffer, setBuffer] = useState('');
  const [memory, setMemory] = useState<SessionMemory>(() => createSessionMemory());
  const [modelId, setModelId] = useState<SupportedModelId>(model ?? supportedModelIds[0]);
  const [intentDraft, setIntentDraft] = useState(initialIntent ?? '');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [executionLogs, setExecutionLogs] = useState<readonly ExecutionLogLine[]>([]);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([
    { id: makeId(), tone: 'system', message: 'Welcome to kitai interactive mode. Type /help for commands.' }
  ]);

  const prompt = useMemo(() => `kitai> ${buffer}`, [buffer]);

  const pushTranscript = (tone: TranscriptEntry['tone'], message: string): void => {
    setTranscript((current) => [...current, { id: makeId(), tone, message }]);
  };

  const handleSlashCommand = async (input: string): Promise<boolean> => {
    const [command, ...rest] = input.trim().split(/\s+/);

    switch (command) {
      case '/help':
        pushTranscript('system', 'Commands: /help, /clear, /log, /model <n>, /exit');
        return true;
      case '/clear':
        setTranscript([]);
        return true;
      case '/log':
        pushTranscript(
          'system',
          memory.recentCommandOutcomes.length > 0
            ? memory.recentCommandOutcomes.map((entry) => `${entry.outcome.toUpperCase()} ${entry.command} (${entry.exitCode})`).join(' | ')
            : 'No command log yet.'
        );
        return true;
      case '/model': {
        const requested = rest.join(' ').trim();
        if (requested.length === 0) {
          pushTranscript('system', `Current model: ${modelId}. Available: ${supportedModelIds.join(', ')}`);
          return true;
        }
        if (supportedModelIds.includes(requested as SupportedModelId)) {
          setModelId(requested as SupportedModelId);
          pushTranscript('system', `Planner model set to ${requested}.`);
        } else {
          pushTranscript('error', `Unsupported model '${requested}'. Available: ${supportedModelIds.join(', ')}.`);
        }
        return true;
      }
      case '/exit':
        exit();
        return true;
      default:
        return false;
    }
  };

  const planIntent = async (intent: string): Promise<void> => {
    setIntentDraft(intent);
    setExecutionLogs([]);
    setFailureMessage(null);
    setExecutionStatus('idle');
    setPhase('planning');
    pushTranscript('user', intent);

    const nextMemory = withPromptMemory(memory, intent);
    setMemory(nextMemory);

    try {
      const [context, config] = await Promise.all([buildPlanContext(cwd, nextMemory), loadConfig()]);
      const nextPlan = await createPlan({
        context,
        userMessage: intent,
        model: modelId ?? config.model
      });

      setPlan(nextPlan);
      setShowDetail(false);
      setMemory(withAcceptedPlanMemory(nextMemory, {
        summary: nextPlan.summary,
        steps: nextPlan.steps.map((step) => step.title)
      }));
      pushTranscript('assistant', nextPlan.summary);
      setPhase(dryRun ? 'done' : 'confirming');

      if (dryRun) {
        pushTranscript('system', 'Dry run enabled: plan generated without executing commands.');
        if (singleShot) {
          exit();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create a plan.';
      pushTranscript('error', message);
      setPhase(singleShot ? 'done' : 'input');
      if (singleShot) {
        exit();
      }
    }
  };

  const executePlan = async (): Promise<void> => {
    if (!plan) {
      return;
    }

    setPhase('executing');
    setExecutionStatus('running');
    setCurrentStepIndex(0);

    const addLog = (line: ExecutionLogLine): void => {
      setExecutionLogs((current) => [...current, line]);
    };

    try {
      for (const [index, step] of plan.steps.entries()) {
        setCurrentStepIndex(index);
        addLog({ id: makeId(), stream: 'system', text: `Starting step ${index + 1}: ${step.title}` });

        if (!step.command) {
          addLog({ id: makeId(), stream: 'system', text: 'No shell command required for this step.' });
          continue;
        }

        const exitCode = await runShellCommand(step.command, addLog);
        setMemory((current) => withCommandOutcomeMemory(current, {
          command: step.command ?? step.title,
          exitCode,
          summary: exitCode === 0 ? `Completed ${step.title}.` : `Failed while running ${step.title}.`
        }));

        if (exitCode !== 0) {
          throw new Error(`Step ${index + 1} exited with code ${exitCode}.`);
        }
      }

      setCurrentStepIndex(plan.steps.length);
      setExecutionStatus('success');
      pushTranscript('assistant', 'Execution finished successfully.');
      setPhase(singleShot ? 'done' : 'input');
      if (singleShot) {
        exit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed.';
      setFailureMessage(message);
      setExecutionStatus('failed');
      pushTranscript('error', message);
      setPhase(singleShot ? 'done' : 'input');
      if (singleShot) {
        exit();
      }
    }
  };

  useEffect(() => {
    if (initialIntent) {
      void planIntent(initialIntent);
    }
  }, []);

  useInput((input, key) => {
    if (phase !== 'input') {
      return;
    }

    if (key.return) {
      const submitted = buffer.trim();
      setBuffer('');
      if (submitted.length === 0) {
        return;
      }
      void (async () => {
        if (submitted.startsWith('/')) {
          const handled = await handleSlashCommand(submitted);
          if (!handled) {
            pushTranscript('error', `Unknown command: ${submitted}`);
          }
          return;
        }
        await planIntent(submitted);
      })();
      return;
    }

    if (key.backspace || key.delete) {
      setBuffer((current) => current.slice(0, -1));
      return;
    }

    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (!key.ctrl && !key.meta && input.length > 0) {
      setBuffer((current) => current + input);
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { color: 'cyanBright', bold: true }, 'kitai — plan, confirm, execute'),
    React.createElement(Text, { dimColor: true }, `Model: ${modelId}${dryRun ? ' • dry-run' : ''}`),
    React.createElement(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      ...transcript.map((entry) => React.createElement(Text, { key: entry.id, color: toneColor[entry.tone] }, entry.message))
    ),
    plan ? React.createElement(Box, { marginTop: 1 }, React.createElement(PlanView, { plan, showDetail })) : null,
    phase === 'planning' ? React.createElement(Text, { color: 'cyan' }, 'Generating plan...') : null,
    phase === 'confirming' && plan
      ? React.createElement(ConfirmPrompt, {
          subject: plan.steps.some((step) => isMutatingStep(step))
            ? 'Review the plan before any mutating command runs.'
            : 'Review the plan before execution.',
          detail: intentDraft,
          onConfirm: () => {
            void executePlan();
          },
          onCancel: () => {
            pushTranscript('system', 'Execution cancelled.');
            setPhase(singleShot ? 'done' : 'input');
            if (singleShot) {
              exit();
            }
          },
          onEdit: async (value) => {
            if (value.length > 0 && value !== intentDraft) {
              await planIntent(value);
            }
          }
        })
      : null,
    phase === 'executing' && plan
      ? React.createElement(ExecutionView, {
          plan,
          currentStepIndex,
          logs: executionLogs,
          status: executionStatus,
          failureMessage
        })
      : null,
    phase === 'input' ? React.createElement(Text, { bold: true }, prompt) : null,
    phase === 'done' && singleShot ? React.createElement(Text, { dimColor: true }, 'Session complete.') : null
  );
};
