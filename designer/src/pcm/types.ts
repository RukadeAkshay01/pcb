/**
 * Plugin and Content Manager (PCM) — data model.
 *
 * The web port of KiCad's Plugin and Content Manager (kicad/pcm/). KiCad's PCM
 * installs three content kinds — plugins, libraries and colour themes — from a
 * repository of packages into the user's `3rdparty` directory. Here the same
 * idea maps to the browser: packages come from a bundled default repository (or
 * a third-party repository added by URL), and "installing" registers the
 * package's payload with the app (a colour theme becomes selectable, a library
 * shows up in the Symbol Editor). Plugins are out of scope for this first
 * version — a web-native, sandboxed plugin runtime is a separate effort.
 */

import type { Theme } from '../editors/schematic/theme.js';

/** PCM_PACKAGE_TYPE (pcm_data.h): the content categories the manager handles. */
export type PackageKind = 'library' | 'colortheme' | 'plugin';

/** One `.kicad_sym` library shipped inside a library package. */
export interface LibraryPayload {
  /** Library nickname (the tree name / sym-lib-table nickname). */
  name: string;
  /** The full `.kicad_sym` S-expression text. */
  text: string;
}

/**
 * A package as advertised by a repository (PCM_PACKAGE). The payload travels
 * with the metadata so an installed package keeps working even when its origin
 * repository is offline.
 */
export interface RepoPackage {
  /** Stable unique identifier, KiCad-style reverse-DNS (e.g. "com.ziroeda.theme.nord"). */
  id: string;
  kind: PackageKind;
  name: string;
  description: string;
  author: string;
  version: string;
  license: string;
  /** Colour-theme payload (present when kind === 'colortheme'). */
  theme?: Theme;
  /** Symbol-library payload (present when kind === 'library'). */
  libraries?: LibraryPayload[];
}

/** A repository (PCM_REPOSITORY): a named catalog of packages. */
export interface Repository {
  /** Fetch URL; empty string identifies the bundled default repository. */
  url: string;
  name: string;
  packages: RepoPackage[];
}

/** An installed package: the advertised package plus install bookkeeping. */
export interface InstalledPackage extends RepoPackage {
  installedAt: number;
  /** Name of the repository it came from (for the details pane). */
  source: string;
}
