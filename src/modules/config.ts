// Environment configuration
const ENV: string = process.env.NODE_ENV || 'development';

const URLS: Record<string, string> = {
  development:
    'https://allen-ic-stage-ui-live-web-pr-709-allen-frontend-team.vercel.app' ||
    process.env.DEV_URL ||
    'https://console.allen-stage.in/',
  stage:
    'https://allen-ic-stage-ui-live-web-pr-709-allen-frontend-team.vercel.app' ||
    process.env.CUSTOM_URL ||
    process.env.STAGE_URL ||
    'https://console.allen-stage.in/',
  production:
    'https://allen-ic-stage-ui-live-web-pr-709-allen-frontend-team.vercel.app' ||
    process.env.PROD_URL ||
    'https://astra.allen.in/',
};

const DEFAULT_URL: string = URLS[ENV] || URLS.development;

export { ENV, URLS, DEFAULT_URL };
