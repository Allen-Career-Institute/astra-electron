// Runtime URL override
//
// Lets a single build be pointed at any deployment (e.g. a Vercel preview for a
// PR) without rebuilding. The override is stored in the user data directory so
// it survives app restarts, and always wins over the URLs coming from
// .env.local (CUSTOM_URL / STAGE_URL / PROD_URL / DEV_URL).

import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const OVERRIDE_FILE_NAME = 'url-override.json';
const MAX_RECENT_URLS = 8;

// PR preview deployments only differ by the PR number, so a number on its own
// is enough to point the app at one. Override with PR_URL_TEMPLATE in
// .env.local if the preview URL shape ever changes.
const DEFAULT_PR_URL_TEMPLATE =
  'https://allen-ic-stage-ui-live-web-pr-{pr}-allen-frontend-team.vercel.app';

const getPrUrlTemplate = (): string =>
  process.env.PR_URL_TEMPLATE || DEFAULT_PR_URL_TEMPLATE;

/** Builds the preview URL for a PR number, e.g. 1131. */
const buildPrUrl = (prNumber: string | number): string =>
  getPrUrlTemplate().replace('{pr}', String(prNumber).trim());

/** Pulls the PR number back out of a URL built from the template, if it matches. */
const extractPrNumber = (url: string): string | null => {
  if (!url) {
    return null;
  }

  const template = getPrUrlTemplate();
  const pattern = new RegExp(
    `^${template
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace('\\{pr\\}', '(\\d+)')}/?$`,
    'i'
  );

  const match = url.match(pattern);
  return match ? match[1] : null;
};

interface UrlOverrideFile {
  url: string | null;
  recents: string[];
}

const EMPTY_STATE: UrlOverrideFile = { url: null, recents: [] };

const getOverrideFilePath = (): string =>
  path.join(app.getPath('userData'), OVERRIDE_FILE_NAME);

/**
 * Accepts what a user would realistically paste (a bare host, a URL with a
 * trailing path, a localhost address) and returns a normalized http(s) origin
 * based URL, or null if it cannot be parsed.
 */
const normalizeUrl = (input: string): string | null => {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return null;
  }

  // A bare number is a PR number: expand it into its preview URL.
  if (/^\d+$/.test(trimmed)) {
    return normalizeUrl(buildPrUrl(trimmed));
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname) {
      return null;
    }
    // Drop a bare trailing slash so stored values stay comparable
    return parsed.toString().replace(/\/$/, '');
  } catch (error) {
    return null;
  }
};

const readOverrideFile = (): UrlOverrideFile => {
  try {
    const filePath = getOverrideFilePath();
    if (!fs.existsSync(filePath)) {
      return { ...EMPTY_STATE };
    }

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      url: typeof parsed?.url === 'string' ? parsed.url : null,
      recents: Array.isArray(parsed?.recents)
        ? parsed.recents.filter((url: unknown) => typeof url === 'string')
        : [],
    };
  } catch (error) {
    console.warn('⚠️  Failed to read URL override file:', error);
    return { ...EMPTY_STATE };
  }
};

const writeOverrideFile = (state: UrlOverrideFile): void => {
  try {
    fs.writeFileSync(
      getOverrideFilePath(),
      JSON.stringify(state, null, 2),
      'utf8'
    );
  } catch (error) {
    console.error('❌ Failed to persist URL override:', error);
    throw error;
  }
};

const getStoredUrlOverride = (): string | null => readOverrideFile().url;

const getRecentUrls = (): string[] => readOverrideFile().recents;

/**
 * Persists the override. Pass null to fall back to the .env.local URL.
 * Returns the normalized URL that was stored.
 */
const storeUrlOverride = (url: string | null): string | null => {
  const state = readOverrideFile();

  if (!url) {
    writeOverrideFile({ ...state, url: null });
    return null;
  }

  const normalized = normalizeUrl(url);
  if (!normalized) {
    throw new Error(`"${url}" is not a valid http(s) URL`);
  }

  const recents = [
    normalized,
    ...state.recents.filter(recent => recent !== normalized),
  ].slice(0, MAX_RECENT_URLS);

  writeOverrideFile({ url: normalized, recents });
  return normalized;
};

export {
  buildPrUrl,
  extractPrNumber,
  getPrUrlTemplate,
  getOverrideFilePath,
  getRecentUrls,
  getStoredUrlOverride,
  normalizeUrl,
  storeUrlOverride,
};
