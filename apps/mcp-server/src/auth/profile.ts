import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import type { RuntimeConfig } from '../config.js';

export interface Profile {
  name: string;
  domain?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface ProfileStore {
  activeProfile: string | null;
  profiles: Record<string, Profile>;
}

const EMPTY_STORE: ProfileStore = { activeProfile: null, profiles: {} };

function storePath(cfg: RuntimeConfig): string {
  return join(cfg.profileDir, 'profile.json');
}

export async function loadProfileStore(cfg: RuntimeConfig): Promise<ProfileStore> {
  try {
    const raw = await readFile(storePath(cfg), 'utf8');
    const parsed = JSON.parse(raw) as ProfileStore;
    if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY_STORE };
    return {
      activeProfile: parsed.activeProfile ?? null,
      profiles: parsed.profiles ?? {},
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ...EMPTY_STORE };
    throw err;
  }
}

export async function saveProfileStore(cfg: RuntimeConfig, store: ProfileStore): Promise<void> {
  await mkdir(cfg.profileDir, { recursive: true, mode: 0o700 });
  const path = storePath(cfg);
  await writeFile(path, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    await chmod(path, 0o600);
  } catch {
    // ignore on platforms that don't support chmod (windows)
  }
}

export async function getActiveProfile(cfg: RuntimeConfig): Promise<Profile | null> {
  const store = await loadProfileStore(cfg);
  if (!store.activeProfile) return null;
  return store.profiles[store.activeProfile] ?? null;
}

export async function upsertProfile(
  cfg: RuntimeConfig,
  profile: Omit<Profile, 'createdAt' | 'updatedAt'>,
  makeActive = true,
): Promise<Profile> {
  const store = await loadProfileStore(cfg);
  const now = Date.now();
  const existing = store.profiles[profile.name];
  const next: Profile = {
    ...profile,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  store.profiles[profile.name] = next;
  if (makeActive || !store.activeProfile) store.activeProfile = profile.name;
  await saveProfileStore(cfg, store);
  return next;
}

export async function listProfiles(cfg: RuntimeConfig): Promise<Profile[]> {
  const store = await loadProfileStore(cfg);
  return Object.values(store.profiles);
}

export async function setActiveProfile(cfg: RuntimeConfig, name: string): Promise<Profile> {
  const store = await loadProfileStore(cfg);
  const profile = store.profiles[name];
  if (!profile) throw new Error(`Profile not found: ${name}`);
  store.activeProfile = name;
  await saveProfileStore(cfg, store);
  return profile;
}
