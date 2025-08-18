// Environment configuration
const ENV: string = process.env.NODE_ENV || 'development';

const URLS: Record<string, string> = {
  development: 'https://console.allen-stage.in/',
  stage: 'https://console.allen-stage.in/',
  production: 'https://astra.allen.in/',
};

const DEFAULT_URL: string = URLS[ENV] || URLS.development;

export { ENV, URLS, DEFAULT_URL };
