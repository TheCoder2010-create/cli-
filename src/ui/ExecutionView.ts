import React from 'react';
import { Box, Static, Text } from 'ink';

import type { Plan } from '../ai/schema.js';

export interface ExecutionLogLine {
  readonly id: string;
  readonly text: string;
  readonly stream: 'stdout' | 'stderr' | 'system';
}

export interface ExecutionViewProps {
  readonly plan: Plan;
  readonly currentStepIndex: number;
  readonly logs: readonly ExecutionLogLine[];
  readonly status: 'idle' | 'running' | 'success' | 'failed';
  readonly failureMessage?: string | null;
}

const streamColor = (stream: ExecutionLogLine['stream']): 'white' | 'yellow' | 'cyan' => {
  switch (stream) {
    case 'stderr':
      return 'yellow';
    case 'system':
      return 'cyan';
    default:
      return 'white';
  }
};

export const ExecutionView = ({
  plan,
  currentStepIndex,
  logs,
  status,
  failureMessage = null
}: ExecutionViewProps): React.JSX.Element =>
  React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'round', paddingX: 1 },
    React.createElement(Text, { bold: true }, 'Execution'),
    ...plan.steps.map((step, index) => {
      const prefix = index < currentStepIndex ? '✔' : index === currentStepIndex && status === 'running' ? '●' : '○';
      const color = index < currentStepIndex ? 'green' : index === currentStepIndex && status === 'failed' ? 'red' : 'white';
      return React.createElement(
        Text,
        { key: `${step.title}-${index}`, color },
        `${prefix} ${index + 1}. ${step.title}${step.command ? ` — ${step.command}` : ''}`
      );
    }),
    React.createElement(Text, { color: status === 'failed' ? 'red' : status === 'success' ? 'green' : 'cyan' },
      status === 'failed'
        ? `Failed: ${failureMessage ?? 'Command execution failed.'}`
        : status === 'success'
          ? 'Completed successfully.'
          : status === 'running'
            ? 'Streaming live command output...'
            : 'Waiting to start.'
    ),
    status === 'failed'
      ? React.createElement(
          Box,
          { flexDirection: 'column', marginTop: 1 },
          React.createElement(Text, { color: 'yellow', bold: true }, 'Retry suggestions'),
          React.createElement(Text, { color: 'yellow' }, '• Review the failing command output above for the first error.'),
          React.createElement(Text, { color: 'yellow' }, '• Re-run with /log after adjusting the prompt or model choice.'),
          React.createElement(Text, { color: 'yellow' }, '• Use e during confirmation to revise the intent before retrying.')
        )
      : null,
    React.createElement(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      React.createElement(Text, { bold: true }, 'Live output'),
      logs.length > 0
        ? React.createElement(
            Static as unknown as React.ComponentType<{ readonly items: readonly ExecutionLogLine[]; readonly children: (item: ExecutionLogLine) => React.ReactNode }>,
            { items: logs.slice(-24), children: (line: ExecutionLogLine) => React.createElement(Text, { key: line.id, color: streamColor(line.stream) }, line.text) }
          )
        : React.createElement(Text, { dimColor: true }, 'No output yet.')
    )
  );
