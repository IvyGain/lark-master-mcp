import { homedir } from 'node:os';
import { resolve } from 'node:path';

export type Identity = 'user' | 'bot' | 'auto';

export interface RuntimeConfig {
  larkCliBin: string;
  profileDir: string;
  defaultIdentity: Identity;
  domain: string | undefined;
  requireConfirm: boolean;
}

function expandTilde(p: string): string {
  if (p.startsWith('~')) return resolve(homedir(), p.slice(p.startsWith('~/') ? 2 : 1));
  return resolve(p);
}

function parseIdentity(raw: string | undefined): Identity {
  if (raw === 'user' || raw === 'bot' || raw === 'auto') return raw;
  return 'auto';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    larkCliBin: env.LARK_CLI_BIN?.trim() || 'lark-cli',
    profileDir: expandTilde(env.LARK_MASTER_PROFILE_DIR?.trim() || '~/.lark-master'),
    defaultIdentity: parseIdentity(env.LARK_DEFAULT_IDENTITY),
    domain: env.LARK_DOMAIN?.trim() || undefined,
    requireConfirm: (env.LARK_MASTER_REQUIRE_CONFIRM ?? '').toLowerCase() === 'true',
  };
}
