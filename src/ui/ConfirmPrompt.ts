import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { execa } from 'execa';
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface ConfirmPromptProps {
  readonly subject: string;
  readonly detail: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onEdit: (value: string) => void | Promise<void>;
}

const defaultEditor = process.env.EDITOR?.trim() || 'vi';

const editWithEditor = async (initialValue: string): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'kitai-edit-'));
  const filePath = path.join(tempDir, 'intent.txt');
  await writeFile(filePath, `${initialValue}\n`, 'utf8');
  await execa(defaultEditor, [filePath], { stdio: 'inherit' });
  return (await readFile(filePath, 'utf8')).trim();
};

export const ConfirmPrompt = ({ subject, detail, onConfirm, onCancel, onEdit }: ConfirmPromptProps): React.JSX.Element => {
  const [showDetail, setShowDetail] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useInput((input) => {
    void (async () => {
      switch (input.toLowerCase()) {
        case 'y':
          onConfirm();
          return;
        case 'n':
          onCancel();
          return;
        case 'd':
          setShowDetail((current) => !current);
          setStatus(null);
          return;
        case 'e':
          setStatus(`Opening ${defaultEditor}...`);
          try {
            const nextValue = await editWithEditor(detail);
            setStatus(nextValue.length > 0 ? 'Updated draft from editor.' : 'Editor closed with an empty draft.');
            await onEdit(nextValue);
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Unable to open the configured editor.');
          }
          return;
        default:
      }
    })();
  });

  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'round', paddingX: 1 },
    React.createElement(Text, { bold: true }, subject),
    React.createElement(Text, null, 'Press y to confirm, n to cancel, e to edit in $EDITOR, or d to toggle detail.'),
    status ? React.createElement(Text, { color: 'cyan' }, status) : null,
    showDetail ? React.createElement(Text, { color: 'gray' }, detail) : null
  );
};
