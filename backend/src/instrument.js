import * as Sentry from '@sentry/node';

// Vacío/no seteada = Sentry.init() no hace nada real; captureException() queda
// como no-op y ningún error se manda a ningún lado (igual que antes de esto).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  includeLocalVariables: true,
});
