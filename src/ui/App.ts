import React from 'react';
import { Box, Text } from 'ink';

import type { SupportedModelId } from '../ai/models/index.js';
import { Repl } from './Repl.js';

export interface AppProps {
  readonly cwd: string;
  readonly intent?: string;
  readonly dryRun?: boolean;
  readonly model?: SupportedModelId;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

class InkErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public override render(): React.ReactNode {
    if (this.state.error) {
      return React.createElement(
        Box,
        { flexDirection: 'column', borderStyle: 'round', paddingX: 1 },
        React.createElement(Text, { color: 'red', bold: true }, 'kitai encountered an unexpected error.'),
        React.createElement(Text, { color: 'red' }, this.state.error.message)
      );
    }

    return this.props.children;
  }
}

export const App = ({ cwd, intent, dryRun = false, model }: AppProps): React.JSX.Element =>
  React.createElement(
    InkErrorBoundary,
    null,
    React.createElement(Repl, {
      cwd,
      dryRun,
      initialIntent: intent,
      model,
      singleShot: Boolean(intent)
    })
  );
