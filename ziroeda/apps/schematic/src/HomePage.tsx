import type { JSX } from 'react';
import './ui/shell.css';

// KiCad's own dark-theme launcher icons (GPL), vendored under assets/launcher.
const ICONS = import.meta.glob('./assets/launcher/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const iconUrl = (id: string): string | undefined => ICONS[`./assets/launcher/${id}.svg`];

/**
 * KiCad project-manager-style home page (the launcher window KiCad opens with).
 * Tile titles and descriptions are taken verbatim from KiCad's
 * KICAD_MANAGER_ACTIONS / panel_kicad_launcher. Only the Schematic Editor is wired
 * up so far; the rest are shown as forthcoming.
 */

interface Tile {
  id: string;
  name: string;
  desc: string;
  enabled?: boolean;
}

const TILES: Tile[] = [
  { id: 'schematic', name: 'Schematic Editor', desc: 'Edit the project schematic', enabled: true },
  { id: 'symbols', name: 'Symbol Editor', desc: 'Edit global and/or project schematic symbol libraries' },
  { id: 'pcb', name: 'PCB Editor', desc: 'Edit the project PCB design' },
  { id: 'footprints', name: 'Footprint Editor', desc: 'Edit global and/or project PCB footprint libraries' },
  { id: 'gerber', name: 'Gerber Viewer', desc: 'Preview Gerber files' },
  { id: 'image', name: 'Image Converter', desc: 'Convert bitmap images to schematic symbols or PCB footprints' },
  { id: 'calculator', name: 'Calculator Tools', desc: 'Show tools for calculating resistance, current capacity, etc.' },
  { id: 'drawingsheet', name: 'Drawing Sheet Editor', desc: 'Edit drawing sheet borders and title blocks for use in schematics and PCB designs' },
  { id: 'pcm', name: 'Plugin and Content Manager', desc: 'Manage downloadable packages from KiCad and 3rd party repositories' },
];

const tileIcon = (id: string): JSX.Element => {
  const url = iconUrl(id);
  return url ? <img src={url} alt="" /> : <span style={{ width: 44, height: 44 }} />;
};

export function HomePage({ projectName, onOpenSchematic }: { projectName: string; onOpenSchematic: () => void }): JSX.Element {
  return (
    <div className="ze-app">
      <div className="ze-menubar">
        {['File', 'View', 'Tools', 'Preferences', 'Help'].map((m) => (
          <div key={m} className="ze-menu">{m}</div>
        ))}
      </div>

      <div className="ze-home-body">
        <div className="ze-panel left" style={{ width: 280 }}>
          <div className="ze-panel-header">Project</div>
          <div className="ze-panel-body">
            <div className="ze-tree-item active">📁 {projectName}</div>
            <div className="ze-tree-item" style={{ paddingLeft: 22 }}>📄 {projectName}.kicad_pro</div>
            <div className="ze-tree-item" style={{ paddingLeft: 22 }} onClick={onOpenSchematic}>
              📐 {projectName}.kicad_sch
            </div>
          </div>
        </div>

        <div className="ze-launchers">
          <h2 className="ze-project-title">{projectName}</h2>
          {TILES.map((t) => (
            <button
              key={t.id}
              className="ze-launcher"
              disabled={!t.enabled}
              title={t.desc}
              onClick={t.enabled ? onOpenSchematic : undefined}
            >
              <span className="ico">{tileIcon(t.id)}</span>
              <span className="txt">
                <span className="name">{t.name}</span>
                <span className="desc">{t.desc}</span>
              </span>
              {!t.enabled && <span className="soon">coming soon</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="ze-statusbar">
        <span className="cell grow">ZiroEDA — open-source EDA in your browser · click Schematic Editor to begin</span>
      </div>
    </div>
  );
}
