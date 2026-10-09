// Server-only: fixed LWA endpoints selected by credential version, never UI language.
import { createHash } from 'node:crypto';
import { REGIONS, type RegionName, type RegionConfig } from './regions';
import type { OAuthConfig, OAuthToken } from './types';
import { safeFailure } from './errors';

const tokens = new Map<string, OAuthToken>();
const pending = new Map<string, Promise<OAuthToken>>();
const cooldowns = new Map<string, number>();
const MAX_CREDENTIALS = 4;

export function getOAuthConfig(): OAuthConfig | null {
  const credentialId = process.env.AMAZON_CREATORS_CREDENTIAL_ID;
  const credentialSecret = process.env.AMAZON_CREATORS_CREDENTIAL_SECRET;
  return credentialId && credentialSecret ? { credentialId, credentialSecret } : null;
}
export function isCreatorsConfigured(): boolean { return getOAuthConfig() !== null; }

export function credentialIdentity(config?: OAuthConfig) {
  const credentials = config || getOAuthConfig();
  if (!credentials?.credentialId || !credentials.credentialSecret) throw new Error('NOT_CONFIGURED');
  const version = process.env.AMAZON_CREATORS_CREDENTIAL_VERSION || '3.1';
  const region = Object.values(REGIONS).find(value => value.version === version);
  if (!region) throw new Error('INVALID_VERSION');
  const key = createHash('sha256').update(JSON.stringify([version, credentials.credentialId, credentials.credentialSecret])).digest('hex');
  return { credentials, region, key };
}
function boundedSet<T>(map: Map<string, T>, key: string, value: T) {
  if (!map.has(key) && map.size >= MAX_CREDENTIALS) map.delete(map.keys().next().value!);
  map.set(key, value);
}
async function fetchToken(region: RegionConfig, config: OAuthConfig, key: string): Promise<OAuthToken> {
  try {
    const response = await fetch(region.authUrl, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: config.credentialId,
        client_secret: config.credentialSecret, scope: 'creatorsapi::default' }),
    });
    if (!response.ok) throw new Error('AUTH_FAILED');
    const body = await response.json();
    if (typeof body.access_token !== 'string' || !body.access_token ||
        !Number.isFinite(body.expires_in) || body.expires_in <= 0) throw new Error('AUTH_FAILED');
    const token = {
      accessToken: body.access_token, version: region.version, region: region.name,
      expiresAt: new Date(Date.now() + Math.max(1, body.expires_in - 60) * 1000),
    };
    boundedSet(tokens, key, token);
    cooldowns.delete(key);
    return token;
  } catch {
    boundedSet(cooldowns, key, Date.now() + 300000);
    throw new Error('AUTH_FAILED');
  }
}
// regionName stays accepted for compatibility; it cannot override credential version.
export async function getAccessToken(_regionName: RegionName = 'NA', config?: OAuthConfig): Promise<OAuthToken> {
  if (typeof window !== 'undefined') throw new Error('NOT_CONFIGURED');
  const { credentials, region, key } = credentialIdentity(config);
  const cached = tokens.get(key);
  if (cached && cached.expiresAt.getTime() > Date.now()) return cached;
  if ((cooldowns.get(key) || 0) > Date.now()) throw new Error('AUTH_COOLDOWN');
  const existing = pending.get(key);
  if (existing) return existing;
  if (pending.size >= MAX_CREDENTIALS) throw new Error('QUEUE_FULL');
  const request = fetchToken(region, credentials, key).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
export async function getAccessTokenForMarketplace(_marketplace: string, config?: OAuthConfig) {
  return getAccessToken('NA', config);
}
export function clearTokenCache(): void { tokens.clear(); }
export function clearTokenForRegion(regionName: RegionName): void {
  for (const [key, value] of tokens) if (value.region === regionName) tokens.delete(key);
}
export async function preWarmTokenCache(_regions: RegionName[] = ['NA'], config?: OAuthConfig): Promise<void> {
  await getAccessToken('NA', config);
}
export function getTokenCacheInfo(): Record<RegionName, { valid: boolean; expiresAt: string | null }> {
  const result = { NA: { valid: false, expiresAt: null }, EU: { valid: false, expiresAt: null }, FE: { valid: false, expiresAt: null } } as Record<RegionName, { valid: boolean; expiresAt: string | null }>;
  for (const token of tokens.values()) result[token.region] = { valid: token.expiresAt.getTime() > Date.now(), expiresAt: token.expiresAt.toISOString() };
  return result;
}
export async function validateCredentials(config?: OAuthConfig) {
  try { await getAccessToken('NA', config); return { success: true as const }; }
  catch (error) { return safeFailure(error); }
}
