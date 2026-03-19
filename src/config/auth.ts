import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const serviceName = 'kitai';
const fallbackWarning = 'Warning: secure credential storage is unavailable; using plaintext fallback at ~/.kitai/credentials.';

type KeytarModule = {
  readonly getPassword: (service: string, account: string) => Promise<string | null>;
  readonly setPassword: (service: string, account: string, password: string) => Promise<void>;
};

interface StoredCredentials {
  readonly [account: string]: string;
}

const getCredentialsPath = (): string => path.join(os.homedir(), '.kitai', 'credentials');

const warnPlaintextFallback = (): void => {
  console.warn(fallbackWarning);
};

export const maskCredential = (value: string | null | undefined): string => {
  if (!value) {
    return '[MASKED]';
  }

  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const loadKeytar = async (): Promise<KeytarModule | null> => {
  const dynamicImport = new Function('specifier', 'return import(specifier);') as (
    specifier: string
  ) => Promise<unknown>;

  try {
    const module = (await dynamicImport('keytar')) as Partial<KeytarModule>;
    if (typeof module.getPassword === 'function' && typeof module.setPassword === 'function') {
      return module as KeytarModule;
    }
  } catch {
    return null;
  }

  return null;
};

const ensureCredentialDirectory = async (): Promise<void> => {
  await mkdir(path.dirname(getCredentialsPath()), { recursive: true, mode: 0o700 });
};

const loadPlaintextCredentials = async (): Promise<StoredCredentials> => {
  try {
    const content = await readFile(getCredentialsPath(), 'utf8');
    const parsed = JSON.parse(content) as unknown;

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      );
    }

    return {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    throw error;
  }
};

const savePlaintextCredential = async (account: string, credential: string): Promise<void> => {
  await ensureCredentialDirectory();
  const credentials = await loadPlaintextCredentials();
  await writeFile(getCredentialsPath(), JSON.stringify({ ...credentials, [account]: credential }, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  });
};

export const saveCredential = async (account: string, credential: string): Promise<void> => {
  const keytar = await loadKeytar();

  if (keytar) {
    await keytar.setPassword(serviceName, account, credential);
    return;
  }

  warnPlaintextFallback();
  await savePlaintextCredential(account, credential);
  console.warn(`Stored masked credential for ${account}: ${maskCredential(credential)}`);
};

export const getCredential = async (account: string): Promise<string | null> => {
  const keytar = await loadKeytar();

  if (keytar) {
    return keytar.getPassword(serviceName, account);
  }

  warnPlaintextFallback();
  const credentials = await loadPlaintextCredentials();
  const credential = credentials[account] ?? null;

  if (credential) {
    console.warn(`Loaded masked credential for ${account}: ${maskCredential(credential)}`);
  }

  return credential;
};
