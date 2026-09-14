// Environment configuration
let ENV: 'development' | 'stage' | 'production' = 'production';
let URLS = {
  development: '',
  stage: '',
  production: '',
};
let ASTRA_ELECTRON_SENTRY_DSN: string = '';
let ASTRA_ELECTRON_SENTRY_ENDPOINT: string = '';
let CURRENT_URL: string = '';
// Runtime override set from the app UI (Settings → Change App URL). When set it
// takes precedence over every URL coming from .env.local.
let URL_OVERRIDE: string | null = null;
let APP_VERSION: string = '';
let UPDATE_AVAILABLE: boolean = false;

// Rolling merge configuration
import { isRollingMergeDisabled as getUserRollingMergeDisabled } from './user-config';
import { URL_OVERRIDE_BUILD_ENABLED } from './buildFlags';

let DISABLE_ROLLING_MERGE: boolean = getUserRollingMergeDisabled(); // Default from user config

const getRollingMergeDisabled = () => {
  return DISABLE_ROLLING_MERGE;
};

const setRollingMergeDisabled = (disabled: boolean) => {
  DISABLE_ROLLING_MERGE = disabled;
};

const getEnv = () => {
  return ENV;
};

const setEnv = (env: 'development' | 'stage' | 'production') => {
  ENV = env;
};

const getSentryDsn = () => {
  return ASTRA_ELECTRON_SENTRY_DSN;
};

const setSentryDsn = (dsn: string) => {
  ASTRA_ELECTRON_SENTRY_DSN = dsn;
};

const getSentryEndpoint = () => {
  return ASTRA_ELECTRON_SENTRY_ENDPOINT;
};

const setSentryEndpoint = (endpoint: string) => {
  ASTRA_ELECTRON_SENTRY_ENDPOINT = endpoint;
};

const getUrls = () => {
  return URLS;
};

// Two gates guard the runtime URL override: a compile-time flag baked into
// dist/main.js by webpack (so production releases cannot be re-enabled by
// editing the shipped .env.local) and the environment the app is pointed at.
const isUrlOverrideEnabled = (): boolean => {
  return URL_OVERRIDE_BUILD_ENABLED && ENV !== 'production';
};

const getUrlOverride = () => {
  return URL_OVERRIDE;
};

const setUrlOverride = (url: string | null) => {
  URL_OVERRIDE = url;
};

// URL the app should point at: the runtime override wins, otherwise the URL
// configured for the current environment.
const getUrlByEnv = () => {
  return (isUrlOverrideEnabled() && URL_OVERRIDE) || URLS[ENV];
};

// URL configured in .env.local for the current environment, ignoring any
// runtime override.
const getEnvUrl = () => {
  return URLS[ENV];
};

const setUrlByEnv = (
  url: string,
  env: 'development' | 'stage' | 'production'
) => {
  URLS[env] = url;
};

const isDev = () => {
  return getEnv() === 'development';
};

const setCurrentUrl = (url: string) => {
  CURRENT_URL = url;
};

const getCurrentUrl = () => {
  return CURRENT_URL;
};

const getAppVersion = () => {
  return APP_VERSION;
};

const setAppVersion = (version: string) => {
  APP_VERSION = version;
};

const isUpdateAvailable = () => {
  return UPDATE_AVAILABLE;
};

const setUpdateAvailable = (available: boolean) => {
  UPDATE_AVAILABLE = available;
};

export {
  isDev,
  getEnv,
  setEnv,
  getUrls,
  setCurrentUrl,
  getCurrentUrl,
  setUrlByEnv,
  getUrlByEnv,
  getEnvUrl,
  getUrlOverride,
  setUrlOverride,
  isUrlOverrideEnabled,
  setSentryDsn,
  setSentryEndpoint,
  getSentryDsn,
  getSentryEndpoint,
  getAppVersion,
  setAppVersion,
  isUpdateAvailable,
  setUpdateAvailable,
  getRollingMergeDisabled,
  setRollingMergeDisabled,
};
