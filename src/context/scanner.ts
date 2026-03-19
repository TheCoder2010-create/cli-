import { Dirent } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { loadYaml } from 'cosmiconfig/dist/loaders.js';

const modelExtensions = new Set(['.gguf', '.safetensors', '.pt', '.bin']);
const datasetExtensions = new Set(['.csv', '.jsonl', '.parquet']);

export interface ContextFile {
  readonly name: string;
  readonly path: string;
  readonly extension: string;
  readonly kind: 'file';
}

export interface ContextDirectory {
  readonly name: string;
  readonly path: string;
  readonly kind: 'directory';
}

export interface ParsedKitfile {
  readonly path: string;
  readonly content: string;
  readonly data: unknown | null;
  readonly parseError: string | null;
}

export interface Context {
  readonly cwd: string;
  readonly topLevelFiles: readonly ContextFile[];
  readonly topLevelDirectories: readonly ContextDirectory[];
  readonly topLevelNames: readonly string[];
  readonly kitfile: ParsedKitfile | null;
  readonly modelFiles: readonly ContextFile[];
  readonly datasetFiles: readonly ContextFile[];
}

const byName = <T extends { name: string }>(left: T, right: T): number => left.name.localeCompare(right.name);

const toFile = (cwd: string, entry: Dirent): ContextFile => ({
  name: entry.name,
  path: path.join(cwd, entry.name),
  extension: path.extname(entry.name).toLowerCase(),
  kind: 'file'
});

const toDirectory = (cwd: string, entry: Dirent): ContextDirectory => ({
  name: entry.name,
  path: path.join(cwd, entry.name),
  kind: 'directory'
});

const parseKitfile = (kitfilePath: string, content: string): ParsedKitfile => {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return {
      path: kitfilePath,
      content,
      data: null,
      parseError: null
    };
  }

  try {
    return {
      path: kitfilePath,
      content,
      data: loadYaml(kitfilePath, content),
      parseError: null
    };
  } catch (yamlError) {
    try {
      return {
        path: kitfilePath,
        content,
        data: JSON.parse(content) as unknown,
        parseError: null
      };
    } catch {
      return {
        path: kitfilePath,
        content,
        data: null,
        parseError: yamlError instanceof Error ? yamlError.message : 'Unable to parse Kitfile.'
      };
    }
  }
};

const hasExtension = (entry: ContextFile, allowedExtensions: ReadonlySet<string>): boolean =>
  allowedExtensions.has(entry.extension);

/**
 * Inspects the current workspace and returns a normalized top-level context snapshot.
 */
export const scanContext = async (cwd: string): Promise<Context> => {
  const entries = (await readdir(cwd, { withFileTypes: true }))
    .filter((entry) => entry.isFile() || entry.isDirectory())
    .sort(byName);

  const topLevelFiles = entries.filter((entry) => entry.isFile()).map((entry) => toFile(cwd, entry));
  const topLevelDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => toDirectory(cwd, entry));

  const kitfileEntry = topLevelFiles.find((entry) => entry.name === 'Kitfile') ?? null;
  const kitfile = kitfileEntry
    ? parseKitfile(kitfileEntry.path, await readFile(kitfileEntry.path, 'utf8'))
    : null;

  return {
    cwd: path.resolve(cwd),
    topLevelFiles,
    topLevelDirectories,
    topLevelNames: entries.map((entry) => entry.name),
    kitfile,
    modelFiles: topLevelFiles.filter((entry) => hasExtension(entry, modelExtensions)),
    datasetFiles: topLevelFiles.filter((entry) => hasExtension(entry, datasetExtensions))
  };
};
