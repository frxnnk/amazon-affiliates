/**
 * Amazon Creators API OAuth 2.0 Token Management
 *
 * Handles token acquisition, caching, and automatic refresh.
 * Tokens are cached in memory with automatic refresh before expiry.
 */

import { REGIONS, type RegionName, type RegionConfig } from './regions';
import type { OAuthConfig, OAuthToken, OAuthTokenResponse, CreatorsError } from './types';

// Token buffer time (refresh 60 seconds before expiry)
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

// In-memory token cache per region
const tokenCache: Map<RegionName, OAuthToken> = new Map();

/**
 * Get OAuth configuration from environment variables
 */
export function getOAuthConfig(): OAuthConfig | null {
  const credentialId = import.meta.env.AMAZON_CREATORS_CREDENTIAL_ID;
  const credentialSecret = import.meta.env.AMAZON_CREATORS_CREDENTIAL_SECRET;

  if (!credentialId || !credentialSecret) {
    return null;
  }

  return { credentialId, credentialSecret };
}

/**
 * Check if Creators API is configured
 */
export function isCreatorsConfigured(): boolean {
  return getOAuthConfig() !== null;
}

/**
 * Fetch a new OAuth token from Amazon Cognito
 */
async function fetchNewToken(
  region: RegionConfig,
  config: OAuthConfig
): Promise<OAuthToken> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.credentialId,
    client_secret: config.credentialSecret,
    scope: 'creatorsapi/default',
  });

  const response = await fetch(region.authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OAuth token request failed (${response.status}): ${errorText.slice(0, 200)}`
    );
  }

  const data: OAuthTokenResponse = await response.json();

  // Calculate expiry time (with buffer)
  const expiresAt = new Date(Date.now() + (data.expires_in * 1000) - TOKEN_REFRESH_BUFFER_MS);

  return {
    accessToken: data.access_token,
    version: data.version || region.version,
    expiresAt,
    region: region.name,
  };
}

/**
 * Check if a cached token is still valid
 */
function isTokenValid(token: OAuthToken): boolean {
  return token.expiresAt > new Date();
}

/**
 * Get an access token for a specific region
 *
 * Tokens are cached and automatically refreshed before expiry.
 *
 * @param regionName - The region to get a token for
 * @param config - Optional OAuth config (uses env vars if not provided)
 * @returns Access token with version info
 *
 * @example
 * const token = await getAccessToken('NA');
 * console.log(token.accessToken); // "eyJ..."
 */
export async function getAccessToken(
  regionName: RegionName,
  config?: OAuthConfig
): Promise<OAuthToken> {
  const oauthConfig = config || getOAuthConfig();

  if (!oauthConfig) {
    throw new Error(
      'Creators API credentials not configured. Set AMAZON_CREATORS_CREDENTIAL_ID and AMAZON_CREATORS_CREDENTIAL_SECRET environment variables.'
    );
  }

  const region = REGIONS[regionName];

  // Check cache
  const cached = tokenCache.get(regionName);
  if (cached && isTokenValid(cached)) {
    return cached;
  }

  // Fetch new token
  console.log(`[Creators OAuth] Fetching new token for region ${regionName}...`);
  const token = await fetchNewToken(region, oauthConfig);

  // Cache the token
  tokenCache.set(regionName, token);

  console.log(`[Creators OAuth] Token cached for region ${regionName}, expires at ${token.expiresAt.toISOString()}`);

  return token;
}

/**
 * Get access token for a specific marketplace
 *
 * Automatically determines the correct region for the marketplace.
 *
 * @param marketplace - Full marketplace domain (e.g., 'www.amazon.com')
 * @param config - Optional OAuth config
 * @returns Access token with version info
 */
export async function getAccessTokenForMarketplace(
  marketplace: string,
  config?: OAuthConfig
): Promise<OAuthToken> {
  // Import here to avoid circular dependency
  const { getRegionForMarketplace } = await import('./regions');
  const region = getRegionForMarketplace(marketplace);
  return getAccessToken(region.name, config);
}

/**
 * Clear the token cache (useful for testing or force refresh)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
  console.log('[Creators OAuth] Token cache cleared');
}

/**
 * Clear token for a specific region
 */
export function clearTokenForRegion(regionName: RegionName): void {
  tokenCache.delete(regionName);
  console.log(`[Creators OAuth] Token cleared for region ${regionName}`);
}

/**
 * Pre-warm token cache for specified regions
 *
 * Useful during application startup to ensure tokens are ready.
 *
 * @param regions - Array of regions to pre-warm (defaults to all)
 */
export async function preWarmTokenCache(
  regions: RegionName[] = ['NA', 'EU', 'FE'],
  config?: OAuthConfig
): Promise<void> {
  console.log(`[Creators OAuth] Pre-warming token cache for regions: ${regions.join(', ')}`);

  const results = await Promise.allSettled(
    regions.map((region) => getAccessToken(region, config))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const region = regions[i];

    if (result.status === 'rejected') {
      console.warn(`[Creators OAuth] Failed to pre-warm token for ${region}:`, result.reason);
    }
  }
}

/**
 * Get cached token info for debugging
 */
export function getTokenCacheInfo(): Record<RegionName, { valid: boolean; expiresAt: string | null }> {
  const info: Record<string, { valid: boolean; expiresAt: string | null }> = {};

  for (const regionName of ['NA', 'EU', 'FE'] as RegionName[]) {
    const token = tokenCache.get(regionName);
    info[regionName] = {
      valid: token ? isTokenValid(token) : false,
      expiresAt: token ? token.expiresAt.toISOString() : null,
    };
  }

  return info as Record<RegionName, { valid: boolean; expiresAt: string | null }>;
}

/**
 * Validate credentials by attempting to fetch a token
 *
 * @returns Success if credentials are valid, error otherwise
 */
export async function validateCredentials(
  config?: OAuthConfig
): Promise<{ success: true } | { success: false; error: CreatorsError }> {
  try {
    await getAccessToken('NA', config);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: `Failed to authenticate with Creators API: ${message}`,
      },
    };
  }
}
