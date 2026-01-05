import siteConfig from '@data/site-config.json';

export type Lang = 'es' | 'en';

export function getAmazonTag(lang: Lang): string {
  return siteConfig.amazon.associates[lang].tag;
}

export function getAmazonMarketplace(lang: Lang): string {
  return siteConfig.amazon.associates[lang].marketplace;
}

export function getAmazonUrl(
  baseUrl: string,
  tag: string,
  _lang: Lang
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('tag', tag);
  url.searchParams.set('linkCode', 'ogi');
  url.searchParams.set('th', '1');
  url.searchParams.set('psc', '1');

  return url.toString();
}

export function generateAmazonProductUrl(asin: string, lang: Lang): string {
  const marketplace = getAmazonMarketplace(lang);
  const tag = getAmazonTag(lang);

  return `https://www.${marketplace}/dp/${asin}?tag=${tag}&linkCode=ogi&th=1&psc=1`;
}

export function isValidAsin(asin: string): boolean {
  return /^[A-Z0-9]{10}$/i.test(asin);
}

export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round((1 - currentPrice / originalPrice) * 100);
}
