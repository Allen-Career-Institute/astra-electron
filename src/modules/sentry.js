const Sentry = require('@sentry/electron');

function initializeSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.SENTRY_DSN_DEV;
  const environment = process.env.NODE_ENV || 'development';

  if (dsn) {
    try {
      const integrations = [];

      if (Sentry.Integrations && Sentry.Integrations.GlobalHandlers) {
        try {
          integrations.push(new Sentry.Integrations.GlobalHandlers());
        } catch (e) {
          console.warn('GlobalHandlers integration not available:', e.message);
        }
      }

      if (Sentry.Integrations && Sentry.Integrations.Process) {
        try {
          integrations.push(new Sentry.Integrations.Process());
        } catch (e) {
          console.warn('Process integration not available:', e.message);
        }
      }

      Sentry.init({
        dsn: dsn,
        environment: environment,
        debug: environment === 'development',
        integrations: integrations,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        attachStacktrace: true,
        includeLocalVariables: true,
        release: process.env.APP_VERSION || '1.0.0',
        dist: process.env.NODE_ENV || 'development',
      });

      console.log(`Sentry initialized for environment: ${environment}`);
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
      console.log('Continuing without Sentry...');
    }
  } else {
    console.log('Sentry DSN not provided, skipping initialization');
  }
}

module.exports = { initializeSentry };
