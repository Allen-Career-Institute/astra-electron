// Environment configuration
const ENV: string = process.env.NODE_ENV || 'development';

const URLS: Record<string, string> = {
  development: process.env.DEV_URL || 'https://console.allen-stage.in/',
  stage:
    process.env.CUSTOM_URL ||
    process.env.STAGE_URL ||
    'https://console.allen-stage.in/',
  production: process.env.PROD_URL || 'https://astra.allen.in/',
};

const DEFAULT_URL: string = URLS[ENV] || URLS.development;

export { ENV, URLS, DEFAULT_URL };
