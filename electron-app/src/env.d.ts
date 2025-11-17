/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_GOOGLE_CLIENT_ID: string
  readonly MAIN_VITE_CLIENT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
