/**
 * Amazon Creators API Region Configuration
 *
 * Maps marketplaces to their respective OAuth endpoints and API versions.
 * Reference: https://developer.amazon.com/docs/creators-api
 */

export type RegionName = 'NA' | 'EU' | 'FE';

export interface RegionConfig {
  name: RegionName;
  version: string;
  authUrl: string;
  marketplaces: string[];
}

/**
 * Region configurations for Amazon Creators API
 */
export const REGIONS: Record<RegionName, RegionConfig> = {
  NA: {
    name: 'NA',
    version: '2.1',
    authUrl: 'https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token',
    marketplaces: [
      'www.amazon.com',
      'www.amazon.ca',
      'www.amazon.com.mx',
      'www.amazon.com.br',
    ],
  },
  EU: {
    name: 'EU',
    version: '2.2',
    authUrl: 'https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token',
    marketplaces: [
      'www.amazon.co.uk',
      'www.amazon.de',
      'www.amazon.fr',
      'www.amazon.it',
      'www.amazon.es',
      'www.amazon.nl',
      'www.amazon.com.be',
      'www.amazon.eg',
      'www.amazon.in',
      'www.amazon.ie',
      'www.amazon.pl',
      'www.amazon.sa',
      'www.amazon.se',
      'www.amazon.com.tr',
      'www.amazon.ae',
    ],
  },
  FE: {
    name: 'FE',
    version: '2.3',
    authUrl: 'https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token',
    marketplaces: [
      'www.amazon.co.jp',
      'www.amazon.sg',
      'www.amazon.com.au',
    ],
  },
};

/**
 * Marketplace domain to region mapping (built from REGIONS)
 */
const marketplaceToRegion: Map<string, RegionConfig> = new Map();
for (const region of Object.values(REGIONS)) {
  for (const marketplace of region.marketplaces) {
    marketplaceToRegion.set(marketplace, region);
  }
}

/**
 * Get region configuration for a marketplace domain
 *
 * @param marketplace - Full marketplace domain (e.g., 'www.amazon.com')
 * @returns Region configuration or NA region as default
 *
 * @example
 * getRegionForMarketplace('www.amazon.es') // Returns EU region
 * getRegionForMarketplace('www.amazon.com') // Returns NA region
 */
export function getRegionForMarketplace(marketplace: string): RegionConfig {
  // Normalize marketplace to full domain format
  const normalizedMarketplace = normalizeMarketplace(marketplace);
  return marketplaceToRegion.get(normalizedMarketplace) || REGIONS.NA;
}

/**
 * Normalize marketplace input to full domain format
 *
 * @param input - Can be 'com', 'es', 'amazon.com', or 'www.amazon.com'
 * @returns Normalized format: 'www.amazon.com'
 */
export function normalizeMarketplace(input: string): string {
  // Remove protocol if present
  let marketplace = input.replace(/^https?:\/\//, '');

  // Remove trailing slashes and paths
  marketplace = marketplace.split('/')[0];

  // Add www.amazon. prefix if needed
  if (!marketplace.startsWith('www.amazon.')) {
    if (marketplace.startsWith('amazon.')) {
      marketplace = 'www.' + marketplace;
    } else {
      // Assume it's just the TLD (e.g., 'com', 'es', 'co.uk')
      marketplace = 'www.amazon.' + marketplace;
    }
  }

  return marketplace;
}

/**
 * Convert short marketplace code to full marketplace domain
 *
 * @param code - Short marketplace code (e.g., 'com', 'es', 'co.uk')
 * @returns Full marketplace domain (e.g., 'www.amazon.com')
 */
export function marketplaceCodeToDomain(code: string): string {
  return `www.amazon.${code}`;
}

/**
 * Get all supported marketplaces across all regions
 */
export function getAllSupportedMarketplaces(): string[] {
  return Array.from(marketplaceToRegion.keys());
}

/**
 * Check if a marketplace is supported by the Creators API
 */
export function isMarketplaceSupported(marketplace: string): boolean {
  const normalized = normalizeMarketplace(marketplace);
  return marketplaceToRegion.has(normalized);
}
