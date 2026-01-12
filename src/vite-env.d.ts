/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_S3_PRESIGN_URL?: string

  readonly VITE_UAZAPI_BASE_URL?: string
  readonly VITE_UAZAPI_TEXT_URL?: string
  readonly VITE_UAZAPI_MEDIA_URL?: string
  readonly VITE_UAZAPI_TOKEN?: string

  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
