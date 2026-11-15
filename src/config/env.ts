/**
 * Application environment configuration.
 * Loads private keys, AI configurations, and endpoints from environment variables (.env).
 */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
  AI: {
    SERVICE_URL: import.meta.env.VITE_AI_SERVICE_URL || '',
    API_KEY: import.meta.env.VITE_AI_API_KEY || '',
    MODEL_VERSION: import.meta.env.VITE_AI_MODEL_VERSION || 'v1.0',
  },
  DEFAULT_BED_ID: import.meta.env.VITE_DEFAULT_BED_ID || '4',
  DEFAULT_LOCALE: (import.meta.env.VITE_DEFAULT_LOCALE as 'en' | 'fr') || 'en',
} as const;

