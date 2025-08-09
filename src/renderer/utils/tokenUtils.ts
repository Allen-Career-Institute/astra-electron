// Token utilities for accessing injected tokens from localStorage

export interface Tokens {
  AUTH_TOKEN?: string;
  API_TOKEN?: string;
  JWT_TOKEN?: string;
  AGORA_APP_ID?: string;
  AGORA_APP_CERTIFICATE?: string;
}

/**
 * Get all tokens from localStorage
 * @returns Tokens object or null if not found
 */
export const getTokens = (): Tokens | null => {
  try {
    const tokensString = localStorage.getItem('tokens');
    if (tokensString) {
      return JSON.parse(tokensString) as Tokens;
    }
    return null;
  } catch (error) {
    console.error('Error parsing tokens from localStorage:', error);
    return null;
  }
};

/**
 * Get a specific token by key
 * @param key - The token key to retrieve
 * @returns The token value or undefined if not found
 */
export const getToken = (key: keyof Tokens): string | undefined => {
  const tokens = getTokens();
  return tokens?.[key];
};

/**
 * Check if tokens are available
 * @returns true if tokens exist in localStorage
 */
export const hasTokens = (): boolean => {
  return getTokens() !== null;
};

/**
 * Get authentication token
 * @returns AUTH_TOKEN or undefined
 */
export const getAuthToken = (): string | undefined => {
  return getToken('AUTH_TOKEN');
};

/**
 * Get API token
 * @returns API_TOKEN or undefined
 */
export const getApiToken = (): string | undefined => {
  return getToken('API_TOKEN');
};

/**
 * Get JWT token
 * @returns JWT_TOKEN or undefined
 */
export const getJwtToken = (): string | undefined => {
  return getToken('JWT_TOKEN');
};

/**
 * Get Agora App ID
 * @returns AGORA_APP_ID or undefined
 */
export const getAgoraAppId = (): string | undefined => {
  return getToken('AGORA_APP_ID');
};

/**
 * Get Agora App Certificate
 * @returns AGORA_APP_CERTIFICATE or undefined
 */
export const getAgoraAppCertificate = (): string | undefined => {
  return getToken('AGORA_APP_CERTIFICATE');
};

/**
 * Log all available tokens (for debugging)
 */
export const logTokens = (): void => {
  const tokens = getTokens();
  if (tokens) {
    console.log('Available tokens:', Object.keys(tokens));
  } else {
    console.log('No tokens found in localStorage');
  }
};
