/**
 * Plugin and Content Manager dialog.
 *
 * The web port of KiCad's DIALOG_PCM. Tabs mirror KiCad's package types —
 * Plugins, Libraries, Colour Themes — over the configured repositories (the
 * bundled default plus any added by URL). Installing a colour theme makes it
 * selectable in the schematic colour settings; installing a library adds it to
 * the Symbol Editor. Plugins need a sandboxed web runtime that does not exist
 * yet, so that tab is a placeholder.
 */

import { useMemo, useState, type JSX } from 'react';
import { settings } from '../prefs/settings.js';
import { pcm, pcmThemeId, usePcmVersion } from './pcmStore.js';
import type { PackageKind, RepoPackage, Repository } from './types.js';
import './pcm.css';

type Tab = 'plugin' | 'library' | 'colortheme';

const TAB_LABELS: [Tab, string][] = [
  ['plugin', 'Plugins'],
  ['library', 'Libraries'],
  ['colortheme', 'Colour Themes'],
];

/** A small swatch row previewing a theme's key colours. */
function ThemeSwatches({ pkg }: { pkg: RepoPackage }): JSX.Element | null {
  if (!pkg.theme) return null;
  const t = pkg.theme;
  const keys = ['background', 'wire', 'bus', 'symbolOutline', 'pin', 'label'] as const;
  return (
    <span className="ze-pcm-swatches" title="Theme preview">
      {keys.map((k) => (
        <span key={k} className="sw" style={{ background: t[k] }} />
      ))}
    </span>
  );
}

export function PluginManagerDialog({ onClose }: { onClose: () => void }): JSX.Element {
  usePcmVersion();
  const [tab, setTab] = useState<Tab>('library');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [addingUrl, setAddingUrl] = useState('');
  const [repoError, setRepoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const repos = pcm.repositories();
  // The active repository (default, unless a custom one is selected).
  const activeRepo: Repository = useMemo(
    () => repos.find((r) => r.url === repoUrl) ?? repos[0]!,
    [repos, repoUrl],
  );

  const packages = activeRepo.packages.filter((p) => p.kind === (tab as PackageKind));

  const addRepo = async (): Promise<void> => {
    const url = addingUrl.trim();
    if (!url) return;
    setBusy(true);
    setRepoError(null);
    try {
      const repo = await pcm.addRepository(url);
      setRepoUrl(repo.url);
      setAddingUrl('');
      setStatus(`Added repository "${repo.name}" (${repo.packages.length} packages)`);
    } catch (err) {
      setRepoError(`Could not load repository: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const install = (pkg: RepoPackage): void => {
    pcm.install(pkg, activeRepo.name);
    setStatus(`Installed "${pkg.name}"`);
  };

  const uninstall = (pkg: RepoPackage): void => {
    pcm.uninstall(pkg.id);
    // If the uninstalled theme was active, fall back to the default.
    if (
      pkg.kind === 'colortheme' &&
      settings.eeschema.appearance.color_theme === pcmThemeId(pkg.id)
    )
      settings.updateEeschema((s) => {
        s.appearance.color_theme = '_builtin_default';
      });
    setStatus(`Uninstalled "${pkg.name}"`);
  };

  const applyTheme = (pkg: RepoPackage): void => {
    settings.updateEeschema((s) => {
      s.appearance.color_theme = pcmThemeId(pkg.id);
    });
    setStatus(`"${pkg.name}" set as the active schematic colour theme`);
  };

  const activeThemeId = settings.eeschema.appearance.color_theme;

  return (
    <div className="ze-modal-backdrop" onMouseDown={onClose}>
      <div className="ze-modal ze-pcm-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ze-modal-header">
          Plugin and Content Manager
          <span className="x" title="Close" onClick={onClose}>
            ✕
          </span>
        </div>

        {/* repository selector + add-by-URL (KiCad's repository chooser) */}
        <div className="ze-pcm-repobar">
          <label>
            Repository:{' '}
            <select value={activeRepo.url} onChange={(e) => setRepoUrl(e.target.value)}>
              {repos.map((r) => (
                <option key={r.url || '_default'} value={r.url}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="ze-pcm-addrepo">
            <input
              type="text"
              placeholder="Add repository by URL…"
              value={addingUrl}
              onChange={(e) => setAddingUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void addRepo()}
            />
            <button
              className="ze-btn sm"
              disabled={busy || !addingUrl.trim()}
              onClick={() => void addRepo()}
            >
              Add
            </button>
            {activeRepo.url && (
              <button
                className="ze-btn sm"
                title="Remove this repository"
                onClick={() => {
                  pcm.removeRepository(activeRepo.url);
                  setRepoUrl('');
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {repoError && <div className="ze-pcm-error">{repoError}</div>}

        {/* tabs */}
        <div className="ze-pcm-tabs">
          {TAB_LABELS.map(([id, label]) => (
            <button
              key={id}
              className={`ze-pcm-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ze-modal-body ze-pcm-body">
          {tab === 'plugin' ? (
            <div className="ze-pcm-empty">
              <p>
                <strong>Plugins are coming soon.</strong>
              </p>
              <p className="ze-muted">
                KiCad plugins are native Python scripts. Ziro Designer runs in the browser, so
                plugins here will use a sandboxed web runtime — a separate piece of work. Libraries
                and colour themes install and work today.
              </p>
            </div>
          ) : packages.length === 0 ? (
            <div className="ze-pcm-empty">
              <p className="ze-muted">
                This repository has no {tab === 'library' ? 'libraries' : 'colour themes'}.
              </p>
            </div>
          ) : (
            <div className="ze-pcm-list">
              {packages.map((pkg) => {
                const installed = pcm.isInstalled(pkg.id);
                const isActiveTheme =
                  pkg.kind === 'colortheme' && activeThemeId === pcmThemeId(pkg.id);
                return (
                  <div key={pkg.id} className="ze-pcm-card">
                    <div className="ze-pcm-card-main">
                      <div className="ze-pcm-card-title">
                        <span className="name">{pkg.name}</span>
                        <span className="ver">v{pkg.version}</span>
                        {pkg.kind === 'colortheme' && <ThemeSwatches pkg={pkg} />}
                        {installed && <span className="badge">Installed</span>}
                        {isActiveTheme && <span className="badge active">Active</span>}
                      </div>
                      <div className="ze-pcm-card-desc">{pkg.description}</div>
                      <div className="ze-pcm-card-meta">
                        by {pkg.author} · {pkg.license}
                        {pkg.kind === 'library' &&
                          pkg.libraries &&
                          ` · ${pkg.libraries.map((l) => l.name).join(', ')}`}
                      </div>
                    </div>
                    <div className="ze-pcm-card-actions">
                      {!installed ? (
                        <button className="ze-btn primary sm" onClick={() => install(pkg)}>
                          Install
                        </button>
                      ) : (
                        <>
                          {pkg.kind === 'colortheme' && !isActiveTheme && (
                            <button className="ze-btn sm" onClick={() => applyTheme(pkg)}>
                              Set active
                            </button>
                          )}
                          <button className="ze-btn sm" onClick={() => uninstall(pkg)}>
                            Uninstall
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ze-modal-footer ze-pcm-footer">
          <span className="ze-pcm-status">{status ?? ''}</span>
          {tab === 'library' && (
            <span className="ze-muted ze-pcm-hint">
              Installed libraries appear in the Symbol Editor.
            </span>
          )}
          {tab === 'colortheme' && (
            <span className="ze-muted ze-pcm-hint">
              Active theme is used by the Schematic Editor (also in Preferences → Colours).
            </span>
          )}
          <button type="button" className="ze-btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
