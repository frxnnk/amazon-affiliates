// Persist user choices only. Amazon titles/images/prices/URLs are never written to browser storage.
const MARKETS = new Set(['amazon.com', 'amazon.es', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.ca', 'amazon.com.mx', 'amazon.com.br', 'amazon.com.au', 'amazon.co.jp', 'amazon.in']);
export function catalogReferences(value) {
  if (!Array.isArray(value)) return [];
  const refs = new Map();
  for (const entry of value) {
    const item = typeof entry === 'string' ? { asin: entry } : entry;
    if (!item || typeof item.asin !== 'string') continue;
    const asin = item.asin.toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(asin)) continue;
    let marketplace = item.marketplace;
    if (!marketplace && item.affiliateUrl) {
      try { marketplace = new URL(item.affiliateUrl).hostname.replace(/^www\./, ''); } catch {}
    }
    marketplace ||= 'amazon.com';
    if (!MARKETS.has(marketplace)) continue;
    const quantity = Number.isSafeInteger(item.quantity) && item.quantity > 0 ? Math.min(item.quantity, 999) : 1;
    refs.set(`${marketplace}:${asin}`, { asin, marketplace, quantity });
  }
  return [...refs.values()];
}
export function readCatalogReferences(storage, key) {
  try {
    const raw = storage.getItem(key) || '[]';
    const refs = catalogReferences(JSON.parse(raw));
    const clean = JSON.stringify(refs);
    if (clean !== raw) storage.setItem(key, clean);
    return refs;
  } catch { return []; }
}
export function writeCatalogReferences(storage, key, items) {
  const refs = catalogReferences(items);
  storage.setItem(key, JSON.stringify(refs));
  return refs;
}
export function currentCatalogItem(item, now = Date.now()) {
  const ref = catalogReferences([item])[0];
  if (!ref) return null;
  const fetched = typeof item.fetchedAt === 'string' ? Date.parse(item.fetchedAt) : NaN;
  if (Number.isFinite(fetched) && fetched <= now && now - fetched < 3600000) return { ...item, ...ref };
  return { ...ref, productId: ref.asin, title: `ASIN: ${ref.asin}`, brand: '', image: '', featuredImage: { url: '', alt: '' },
    price: null, originalPrice: null, currency: '', affiliateUrl: '', fetchedAt: null };
}
export async function refreshCatalogReferences(references, { lang = 'en', fetcher = globalThis.fetch, signal } = {}) {
  const results = [];
  for (const ref of catalogReferences(references)) {
    if (signal?.aborted) break;
    let item = currentCatalogItem(ref);
    try {
      const response = await fetcher('/api/feed/product-by-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
        body: JSON.stringify({ url: `https://www.${ref.marketplace}/dp/${ref.asin}`, lang }),
      });
      const body = await response.json();
      if (response.ok && body.success && body.product?.asin === ref.asin) {
        item = currentCatalogItem({ ...body.product, ...ref, image: body.product.image || body.product.featuredImage?.url || '' });
      }
    } catch {}
    results.push(item);
  }
  return results;
}
