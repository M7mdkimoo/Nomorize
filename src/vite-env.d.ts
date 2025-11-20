/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATABASE_URL: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
  // add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}