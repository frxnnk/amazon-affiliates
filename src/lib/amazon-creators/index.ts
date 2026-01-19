/**
 * Amazon Creators API Module
 *
 * This module provides a client for the Amazon Creators API (OAuth 2.0).
 * It replaces PA-API 5.0 as the primary source for Amazon product data.
 *
 * Usage:
 * ```typescript
 * import { getItem, isCreatorsConfigured } from '@lib/amazon-creators';
 *
 * if (isCreatorsConfigured()) {
 *   const result = await getItem('B09B2SBHQK', 'www.amazon.com');
 *   if (result.success) {
 *     console.log(result.data.title);
 *   }
 * }
 * ```
 *
 * Required environment variables:
 * - AMAZON_CREATORS_CREDENTIAL_ID
 * - AMAZON_CREATORS_CREDENTIAL_SECRET
 *
 * Optional (for partner tag):
 * - AMAZON_PA_API_PARTNER_TAG
 */

// Client exports
export {
  getItem,
  getItems,
  getItemsBatched,
  calculateDiscount,
} from './client';

// OAuth exports
export {
  isCreatorsConfigured,
  getOAuthConfig,
  getAccessToken,
  getAccessTokenForMarketplace,
  clearTokenCache,
  clearTokenForRegion,
  preWarmTokenCache,
  getTokenCacheInfo,
  validateCredentials,
} from './oauth';

// Region exports
export {
  REGIONS,
  getRegionForMarketplace,
  normalizeMarketplace,
  marketplaceCodeToDomain,
  getAllSupportedMarketplaces,
  isMarketplaceSupported,
} from './regions';

// Type exports
export type {
  // OAuth types
  OAuthConfig,
  OAuthToken,
  OAuthTokenResponse,
  // Region types
  RegionName,
  RegionConfig,
} from './regions';

export type {
  // Request types
  ItemIdType,
  CreatorsResource,
  GetItemsRequest,
  // Response types
  ImageSize,
  ItemImages,
  ItemInfo,
  PriceInfo,
  OfferListing,
  OffersV2,
  CustomerReviews,
  BrowseNode,
  BrowseNodeInfo,
  CreatorsApiItem,
  GetItemsResponse,
  // Normalized types
  CreatorsProductData,
  // Result types
  CreatorsError,
  CreatorsResult,
  GetItemsResult,
} from './types';

export { DEFAULT_RESOURCES } from './types';
