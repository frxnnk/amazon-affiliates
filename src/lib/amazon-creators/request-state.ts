import { failure, safeFailure } from './errors';
import { getAccessToken } from './oauth';
import type { OAuthConfig, OAuthToken, SearchItemsResult } from './types';

const CACHE_TTL = 3600000;
const MAX_CACHE = 100;
const MAX_PENDING = 20;
const cache = new Map<string, { expiresAt: number; result: SearchItemsResult }>();
const inFlight = new Map<string, Promise<SearchItemsResult>>();
let queue = Promise.resolve();
let lastStart = 0;
let cooldownUntil = 0;
let budgetDay = '';
let used = 0;
function checkLimits(): SearchItemsResult | null {
  if (Date.now() < cooldownUntil) return failure('RATE_LIMITED');
  const today = new Date(Date.now()).toISOString().slice(0, 10);
  if (today !== budgetDay) { budgetDay = today; used = 0; }
  const configured = Number(process.env.AMAZON_CREATORS_DAILY_LIMIT ?? 1000);
  const limit = Number.isSafeInteger(configured) && configured >= 0 ? Math.min(configured, 1000) : 1000;
  return used >= limit ? failure('DAILY_LIMIT') : null;
}
export function pauseCatalog(retryAfter?: string | null): void {
  const seconds = Number(retryAfter);
  const duration = Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, Math.max(60, seconds)) : 300;
  cooldownUntil = Math.max(cooldownUntil, Date.now() + duration * 1000);
}
// Process-local shared budget/cache. No product content is written to permanent storage.
export async function cachedCatalogRequest(key: string, fetcher: (token: OAuthToken) => Promise<SearchItemsResult>, config?: OAuthConfig): Promise<SearchItemsResult> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return structuredClone(hit.result);
  cache.delete(key);
  const existing = inFlight.get(key);
  if (existing) return structuredClone(await existing);
  const blocked = checkLimits();
  if (blocked) return blocked;
  if (inFlight.size >= MAX_PENDING) return failure('QUEUE_FULL');
  const request = queue.then(async () => {
    try {
      const blocked = checkLimits();
      if (blocked) return blocked;
      // Authenticate only on a cache miss when its queued turn begins. Failed auth
      // does not consume the catalog budget, and queued calls receive a fresh token.
      const token = await getAccessToken('NA', config);
      const delay = lastStart + 1000 - Date.now();
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      const recheck = checkLimits();
      if (recheck) return recheck;
      lastStart = Date.now();
      used++;
      const result = await fetcher(token);
      if (result.success) {
        for (const [entry, value] of cache) if (value.expiresAt <= Date.now()) cache.delete(entry);
        if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
        cache.set(key, { expiresAt: Date.now() + CACHE_TTL, result: structuredClone(result) });
      }
      return result;
    } catch (error) { return safeFailure(error); }
  });
  queue = request.then(() => undefined, () => undefined);
  inFlight.set(key, request);
  try { return structuredClone(await request); }
  finally { inFlight.delete(key); }
}
