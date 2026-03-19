import React from 'react';
import { Box, Text } from 'ink';

import type { Plan, RiskLevel } from '../ai/schema.js';

export interface PlanViewProps {
  readonly plan: Plan;
  readonly showDetail?: boolean;
}

const riskColor: Record<RiskLevel, 'green' | 'yellow' | 'red'> = {
  low: 'green',
  medium: 'yellow',
  high: 'red'
};

const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export const PlanView = ({ plan, showDetail = true }: PlanViewProps): React.JSX.Element =>
  React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'round', paddingX: 1, paddingY: 0 },
    React.createElement(
      Box,
      { justifyContent: 'space-between' },
      React.createElement(Text, { bold: true }, 'Proposed plan'),
      React.createElement(Text, { color: riskColor[plan.overallRisk], bold: true }, `[${titleCase(plan.overallRisk)} risk]`)
    ),
    React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
      React.createElement(Text, { bold: true }, 'Summary'),
      React.createElement(Text, null, plan.summary)
    ),
    plan.warnings.length > 0
      ? React.createElement(
          Box,
          { marginTop: 1, flexDirection: 'column' },
          React.createElement(Text, { color: 'yellow', bold: true }, 'Warnings'),
          ...plan.warnings.map((warning, index) =>
            React.createElement(Text, { key: `warning-${index}`, color: 'yellow' }, `• ${warning}`)
          )
        )
      : null,
    React.createElement(
      Box,
      { marginTop: 1, flexDirection: 'column' },
      React.createElement(Text, { bold: true }, 'Steps'),
      ...plan.steps.map((step, index) =>
        React.createElement(
          Box,
          { key: `${step.title}-${index}`, flexDirection: 'column', marginTop: index === 0 ? 0 : 1 },
          React.createElement(
            Text,
            null,
            `${index + 1}. ${step.title} `,
            React.createElement(Text, { color: riskColor[step.risk] }, `[${titleCase(step.risk)}]`),
            step.requiresConfirmation ? React.createElement(Text, { color: 'magenta' }, ' [confirm]') : null
          ),
          React.createElement(Text, { dimColor: true }, step.description),
          showDetail && step.command
            ? React.createElement(Text, { color: 'cyan' }, `$ ${step.command}`)
            : null
        )
      )
    )
  );
