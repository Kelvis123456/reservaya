import * as Sentry from '@sentry/react';

// Sin VITE_SENTRY_DSN seteada, Sentry.init() queda deshabilitado (mismo
// comportamiento que sin esto).
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
});
