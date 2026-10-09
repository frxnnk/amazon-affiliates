/**
 * Amazon link -> affiliate link conversion (used by the Telegram webhook).
 * Pure functions: tags and fetch are passed in so this is easy to test.
 */

const SHORT_HOSTS = /^(amzn\.(to|eu|asia)|a\.co)$/i;
const ASIN_RE = /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin|o\/ASIN)\/([A-Z0-9]{10})(?=[/?#]|$)/i;

export type ConvertResult =
  | { ok: true; url: string; asin: string; domain: string }
  | { ok: false; error: 'invalid' | 'not_amazon' | 'no_asin' | 'no_tag'; domain?: string };

/** Extract http(s) URLs from free text, without trailing punctuation. */
export function findUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"]+/gi) ?? []).map((u) => u.replace(/[).,!?;:]+$/, ''));
}

/** Follow amzn.to / a.co / amzn.eu redirects until an amazon.* URL (max 5 hops). */
export async function resolveShortUrl(url: string, fetchFn: typeof fetch = fetch): Promise<string> {
  let current = url;
  for (let i = 0; i < 5; i++) {
    const host = new URL(current).hostname.replace(/^www\./, '');
    if (!SHORT_HOSTS.test(host)) return current;
    const res = await fetchFn(current, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    const location = res.headers.get('location');
    if (!location) return current;
    current = new URL(location, current).toString();
  }
  return current;
}

/**
 * Build a clean affiliate URL. Drops every tracking param from the original
 * link (including someone else's tag) and keeps only /dp/ASIN?tag=ours.
 * tags: { 'amazon.com': 'mytag-20', 'amazon.es': 'mytag-21' }
 */
export function toAffiliateUrl(url: string, tags: Record<string, string>): ConvertResult {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  const domain = u.hostname.toLowerCase().replace(/^(www|smile|m)\./, '');
  if (!/^amazon\.(?:[a-z]{2,3}|com?\.[a-z]{2})$/.test(domain)) return { ok: false, error: 'not_amazon' };
  const asin = u.pathname.match(ASIN_RE)?.[1]?.toUpperCase();
  if (!asin) return { ok: false, error: 'no_asin' };
  const tag = tags[domain];
  if (!tag) return { ok: false, error: 'no_tag', domain };
  return { ok: true, asin, domain, url: `https://www.${domain}/dp/${asin}?tag=${tag}` };
}
