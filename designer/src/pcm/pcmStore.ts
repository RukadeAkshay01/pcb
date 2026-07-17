/**
 * Plugin and Content Manager store.
 *
 * The web port of KiCad's PLUGIN_CONTENT_MANAGER: it owns the set of installed
 * packages and the list of configured repositories, persists both to
 * localStorage (the equivalent of KiCad's `installed_packages.json`), and
 * notifies subscribers so React views re-render through useSyncExternalStore.
 *
 * This module is intentionally free of app/settings imports so it can be read
 * from anywhere (e.g. the Symbol Editor bootstrap) without an import cycle.
 */

import { useSyncExternalStore } from 'react';
import type { Theme } from '../editors/schematic/theme.js';
import { DEFAULT_REPOSITORY } from './defaultRepo.js';
import type { InstalledPackage, LibraryPayload, Repository, RepoPackage } from './types.js';

const INSTALLED_KEY = 'ziroeda.pcm.installed';
const REPOS_KEY = 'ziroeda.pcm.repos';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function storeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — installs simply don't persist */
  }
}

type Listener = () => void;

/** A configured third-party repository (its packages are fetched, then cached). */
interface CustomRepo {
  url: string;
  name: string;
}

class PcmStore {
  /** Installed packages by id. */
  private installed: Record<string, InstalledPackage> = loadJson(INSTALLED_KEY, {});
  /** URLs of third-party repositories added by the user. */
  private customRepos: CustomRepo[] = loadJson(REPOS_KEY, []);
  /** Fetched third-party repositories this session (url -> Repository). */
  private fetched = new Map<string, Repository>();

  private listeners = new Set<Listener>();
  /** Monotonic snapshot id for useSyncExternalStore. */
  version = 0;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private notify(): void {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  // ---- repositories ----------------------------------------------------------

  /** All repositories: the bundled default first, then any added by URL. */
  repositories(): Repository[] {
    const repos: Repository[] = [DEFAULT_REPOSITORY];
    for (const r of this.customRepos) {
      repos.push(this.fetched.get(r.url) ?? { url: r.url, name: r.name, packages: [] });
    }
    return repos;
  }

  /**
   * Add and fetch a third-party repository. The JSON is expected to be a
   * `{ name, packages: RepoPackage[] }` document (KiCad's repository index,
   * simplified for the web). Throws on a network / parse error.
   */
  async addRepository(url: string): Promise<Repository> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = (await res.json()) as { name?: string; packages?: RepoPackage[] };
    const repo: Repository = {
      url,
      name: doc.name || url,
      packages: Array.isArray(doc.packages) ? doc.packages : [],
    };
    this.fetched.set(url, repo);
    if (!this.customRepos.some((r) => r.url === url)) {
      this.customRepos = [...this.customRepos, { url, name: repo.name }];
      storeJson(REPOS_KEY, this.customRepos);
    }
    this.notify();
    return repo;
  }

  removeRepository(url: string): void {
    this.customRepos = this.customRepos.filter((r) => r.url !== url);
    this.fetched.delete(url);
    storeJson(REPOS_KEY, this.customRepos);
    this.notify();
  }

  // ---- install / uninstall ---------------------------------------------------

  isInstalled(id: string): boolean {
    return id in this.installed;
  }

  installedVersion(id: string): string | undefined {
    return this.installed[id]?.version;
  }

  install(pkg: RepoPackage, source: string): void {
    this.installed = {
      ...this.installed,
      [pkg.id]: { ...pkg, installedAt: Date.now(), source },
    };
    storeJson(INSTALLED_KEY, this.installed);
    this.notify();
  }

  uninstall(id: string): void {
    if (!(id in this.installed)) return;
    const next = { ...this.installed };
    delete next[id];
    this.installed = next;
    storeJson(INSTALLED_KEY, this.installed);
    this.notify();
  }

  installedList(): InstalledPackage[] {
    return Object.values(this.installed).sort((a, b) => b.installedAt - a.installedAt);
  }

  // ---- payload accessors (consumed by the rest of the app) -------------------

  /** Installed colour themes keyed by their PCM theme id ("pcm:<packageId>"). */
  installedThemes(): { id: string; name: string; theme: Theme }[] {
    return this.installedList()
      .filter((p) => p.kind === 'colortheme' && p.theme)
      .map((p) => ({ id: pcmThemeId(p.id), name: p.name, theme: p.theme as Theme }));
  }

  /** Resolve a colour theme by its PCM theme id, or undefined if not installed. */
  themeById(pcmId: string): Theme | undefined {
    const pkgId = pcmId.startsWith('pcm:') ? pcmId.slice(4) : pcmId;
    const p = this.installed[pkgId];
    return p?.kind === 'colortheme' ? p.theme : undefined;
  }

  /** All symbol libraries contributed by installed library packages. */
  installedLibraries(): LibraryPayload[] {
    const libs: LibraryPayload[] = [];
    for (const p of this.installedList()) {
      if (p.kind === 'library') libs.push(...(p.libraries ?? []));
    }
    return libs;
  }
}

/** The PCM theme id used in settings for an installed theme package. */
export function pcmThemeId(packageId: string): string {
  return `pcm:${packageId}`;
}

export const pcm = new PcmStore();

// ---- React bindings ----------------------------------------------------------

export function usePcmVersion(): number {
  return useSyncExternalStore(pcm.subscribe, () => pcm.version);
}
