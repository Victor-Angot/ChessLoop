/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** GA4 measurement ID (e.g. G-XXXXXXXXXX). Optional. */
  readonly VITE_GA_MEASUREMENT_ID?: string
}

interface Window {
  gtag?: (...args: unknown[]) => void
  dataLayer?: unknown[]
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
