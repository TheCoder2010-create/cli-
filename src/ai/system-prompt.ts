export interface SessionTurn {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface SystemPromptContext {
  readonly cwd: string;
  readonly topLevelFiles: readonly string[];
  readonly kitfileContent: string | null;
  readonly sessionHistory: readonly SessionTurn[];
}

const kitCliReference = [
  'KIT CLI reference material:',
  '- Operate relative to the provided current working directory.',
  '- Prefer safe, incremental steps that preserve user data.',
  '- Use the Kitfile when present as the primary local source of truth.',
  '- Mention commands only when they are necessary and concrete.',
  '- If no shell command is required, set the step command to null.'
].join('\n');

const safetyRules = [
  'Safety rules:',
  '- Never suggest destructive or irreversible actions without an explicit confirmation gate.',
  '- Avoid exposing secrets, credentials, tokens, API keys, or environment variable values.',
  '- Prefer read-only inspection before write operations.',
  '- Call out assumptions, blockers, and missing context in warnings.',
  '- Keep recommendations bounded to the repository and context provided.'
].join('\n');

const riskClassificationRules = [
  'Risk classification rules:',
  '- low: read-only inspection, documentation review, or safe local generation.',
  '- medium: file edits, dependency changes, or non-destructive commands that modify the workspace.',
  '- high: destructive actions, permission changes, data migration, or commands that could remove/overwrite user data.',
  '- Mark requiresConfirmation true for any high-risk step and for medium-risk steps that could surprise the user.'
].join('\n');

const planSchemaContract = [
  'Return JSON only. Do not wrap it in markdown fences.',
  'The JSON must match this schema exactly:',
  '{',
  '  "summary": string,',
  '  "overallRisk": "low" | "medium" | "high",',
  '  "steps": [',
  '    {',
  '      "title": string,',
  '      "description": string,',
  '      "command": string | null,',
  '      "risk": "low" | "medium" | "high",',
  '      "requiresConfirmation": boolean',
  '    }',
  '  ],',
  '  "warnings": string[]',
  '}'
].join('\n');

const formatSessionHistory = (sessionHistory: readonly SessionTurn[]): string => {
  if (sessionHistory.length === 0) {
    return 'None';
  }

  return sessionHistory
    .map((turn, index) => `${index + 1}. [${turn.role}] ${turn.content}`)
    .join('\n');
};

/**
 * Builds the system prompt for planner models using local repository context.
 */
export const buildSystemPrompt = (context: SystemPromptContext): string => {
  const topLevelFiles = context.topLevelFiles.length > 0 ? context.topLevelFiles.join(', ') : 'None';
  const kitfileContent = context.kitfileContent?.trim() ? context.kitfileContent : 'No Kitfile found.';

  return [
    'You are the planning engine for kitai, a Kit CLI assistant.',
    kitCliReference,
    safetyRules,
    riskClassificationRules,
    'Current context:',
    `- cwd: ${context.cwd}`,
    `- top-level files: ${topLevelFiles}`,
    `- Kitfile content:\n${kitfileContent}`,
    `- session history:\n${formatSessionHistory(context.sessionHistory)}`,
    planSchemaContract
  ].join('\n\n');
};
