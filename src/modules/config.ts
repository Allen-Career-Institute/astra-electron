// Environment configuration
// const ENV: string =  process.env.NODE_ENV || 'production';

// const URLS: Record<string, string> = {
//   development:
//     process.env.CUSTOM_URL ||
//     process.env.DEV_URL ||
//     'https://console.allen-stage.in/',
//   stage:
//     process.env.CUSTOM_URL ||
//     process.env.STAGE_URL ||
//     'https://console.allen-stage.in/',
//   production: process.env.PROD_URL || 'https://astra.allen.in/',
// };

const ENV: string = 'stage';
const URLS: Record<string, string> = {
  development:
    'https://allen-ic-stage-ui-live-web-pr-709-allen-frontend-team.vercel.app',
  stage:
    'https://allen-ic-stage-ui-live-web-pr-709-allen-frontend-team.vercel.app',
  production:
    'https://allen-ic-stage-ui-live-web-pr-709-allen-frontend-team.vercel.app',
};

const DEFAULT_URL: string = URLS[ENV] || URLS.development;

export { ENV, URLS, DEFAULT_URL };
