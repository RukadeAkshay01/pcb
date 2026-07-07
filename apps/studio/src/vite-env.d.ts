/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Build stamp (git SHA + UTC time) injected by vite.config.ts `define`. */
declare const __BUILD_STAMP__: string;
