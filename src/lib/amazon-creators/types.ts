/**
 * Amazon Creators API Type Definitions
 *
 * Based on Creators API v2.1/v2.2/v2.3 specification.
 * Reference: https://developer.amazon.com/docs/creators-api
 */

import type { RegionName } from './regions';

// ============================================================================
// OAuth Types
// ============================================================================

export interface OAuthConfig {
  credentialId: string;
  credentialSecret: string;
}

export interface OAuthToken {
  accessToken: string;
  version: string;
  expiresAt: Date;
  region: RegionName;
}

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
  version: string;
}

// ============================================================================
// API Request Types
// ============================================================================

export type ItemIdType = 'ASIN';

/**
 * Available resources to request from GetItems endpoint
 */
export type CreatorsResource =
  // Images
  | 'images.primary.small'
  | 'images.primary.medium'
  | 'images.primary.large'
  | 'images.primary.highRes'
  | 'images.variants.small'
  | 'images.variants.medium'
  | 'images.variants.large'
  | 'images.variants.highRes'
  // Item Info
  | 'itemInfo.title'
  | 'itemInfo.features'
  | 'itemInfo.byLineInfo'
  | 'itemInfo.contentInfo'
  | 'itemInfo.classifications'
  | 'itemInfo.externalIds'
  | 'itemInfo.manufactureInfo'
  | 'itemInfo.productInfo'
  | 'itemInfo.technicalInfo'
  // Offers V2 (new in Creators API)
  | 'offersV2.listings.price'
  | 'offersV2.listings.availability'
  | 'offersV2.listings.condition'
  | 'offersV2.listings.dealDetails'
  | 'offersV2.listings.isBuyBoxWinner'
  | 'offersV2.listings.merchantInfo'
  // Browse
  | 'browseNodeInfo.browseNodes'
  | 'browseNodeInfo.browseNodes.ancestor'
  | 'browseNodeInfo.browseNodes.salesRank'
  // Reviews
  | 'customerReviews.count'
  | 'customerReviews.starRating'
  // Other
  | 'parentASIN';

export interface GetItemsRequest {
  itemIds: string[];
  itemIdType: ItemIdType;
  marketplace: string;
  partnerTag: string;
  resources: CreatorsResource[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ImageSize {
  URL: string;
  Height: number;
  Width: number;
}

export interface ItemImages {
  Primary?: {
    Small?: ImageSize;
    Medium?: ImageSize;
    Large?: ImageSize;
    HighRes?: ImageSize;
  };
  Variants?: Array<{
    Small?: ImageSize;
    Medium?: ImageSize;
    Large?: ImageSize;
    HighRes?: ImageSize;
  }>;
}

export interface ItemInfo {
  Title?: {
    DisplayValue: string;
    Label: string;
    Locale: string;
  };
  Features?: {
    DisplayValues: string[];
    Label: string;
    Locale: string;
  };
  ByLineInfo?: {
    Brand?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
    Manufacturer?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
  };
  ProductInfo?: {
    Color?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
    Size?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
    ItemDimensions?: {
      Height?: { DisplayValue: number; Unit: string };
      Length?: { DisplayValue: number; Unit: string };
      Width?: { DisplayValue: number; Unit: string };
      Weight?: { DisplayValue: number; Unit: string };
    };
  };
  TechnicalInfo?: {
    Formats?: {
      DisplayValues: string[];
      Label: string;
      Locale: string;
    };
  };
  Classifications?: {
    Binding?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
    ProductGroup?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
  };
  ManufactureInfo?: {
    ItemPartNumber?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
    Model?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
    Warranty?: {
      DisplayValue: string;
      Label: string;
      Locale: string;
    };
  };
}

export interface PriceInfo {
  Amount: number;
  Currency: string;
  DisplayAmount: string;
  PricePerUnit?: number;
  Savings?: {
    Amount: number;
    Currency: string;
    DisplayAmount: string;
    Percentage: number;
  };
}

export interface OfferListing {
  Price?: PriceInfo;
  SavingBasis?: PriceInfo;
  Availability?: {
    MaxOrderQuantity?: number;
    Message?: string;
    MinOrderQuantity?: number;
    Type?: string;
  };
  Condition?: {
    Value: string;
    SubCondition?: {
      Value: string;
    };
  };
  IsBuyBoxWinner?: boolean;
  MerchantInfo?: {
    DefaultShippingCountry?: string;
    FeedbackCount?: number;
    FeedbackRating?: number;
    Id?: string;
    Name?: string;
  };
  DealDetails?: {
    AccessDeniedMessage?: string;
    DealEndTime?: string;
    DealStartTime?: string;
    DealType?: string;
    PercentClaimed?: number;
  };
}

export interface OffersV2 {
  Listings?: OfferListing[];
  Summaries?: Array<{
    Condition?: { Value: string };
    HighestPrice?: PriceInfo;
    LowestPrice?: PriceInfo;
    OfferCount?: number;
  }>;
}

export interface CustomerReviews {
  Count?: number;
  StarRating?: {
    Value: number;
  };
}

export interface BrowseNode {
  Id: string;
  DisplayName: string;
  ContextFreeName?: string;
  IsRoot?: boolean;
  Ancestor?: BrowseNode;
  SalesRank?: number;
}

export interface BrowseNodeInfo {
  BrowseNodes?: BrowseNode[];
}

export interface CreatorsApiItem {
  ASIN: string;
  DetailPageURL?: string;
  Images?: ItemImages;
  ItemInfo?: ItemInfo;
  OffersV2?: OffersV2;
  CustomerReviews?: CustomerReviews;
  BrowseNodeInfo?: BrowseNodeInfo;
  ParentASIN?: string;
}

export interface GetItemsResponse {
  ItemsResult?: {
    Items?: CreatorsApiItem[];
  };
  Errors?: Array<{
    Code: string;
    Message: string;
  }>;
}

// ============================================================================
// Normalized Product Data (for adapter)
// ============================================================================

export interface CreatorsProductData {
  asin: string;
  title: string;
  brand: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  rating: number | null;
  totalReviews: number | null;
  imageUrl: string | null;
  images: string[];
  features: string[];
  description: string | null;
  url: string;
  availability: string | null;
  isBuyBoxWinner: boolean;
  dealType: string | null;
  dealEndTime: string | null;
  categories: string[];
}

// ============================================================================
// Result Types
// ============================================================================

export interface CreatorsError {
  code: string;
  message: string;
}

export type CreatorsResult<T> =
  | { success: true; data: T }
  | { success: false; error: CreatorsError };

export type GetItemsResult = CreatorsResult<CreatorsProductData[]>;

// ============================================================================
// Default Resources
// ============================================================================

/**
 * Default resources to request for product details
 * Includes all commonly needed fields
 */
export const DEFAULT_RESOURCES: CreatorsResource[] = [
  // Images
  'images.primary.large',
  'images.primary.highRes',
  'images.variants.large',
  // Item Info
  'itemInfo.title',
  'itemInfo.features',
  'itemInfo.byLineInfo',
  'itemInfo.classifications',
  'itemInfo.productInfo',
  // Offers V2
  'offersV2.listings.price',
  'offersV2.listings.availability',
  'offersV2.listings.condition',
  'offersV2.listings.dealDetails',
  'offersV2.listings.isBuyBoxWinner',
  'offersV2.listings.merchantInfo',
  // Reviews
  'customerReviews.count',
  'customerReviews.starRating',
  // Browse
  'browseNodeInfo.browseNodes',
];
