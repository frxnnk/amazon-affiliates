import type { RegionName } from './regions';
export interface OAuthConfig { credentialId: string; credentialSecret: string }
export interface OAuthToken { accessToken: string; version: string; expiresAt: Date; region: RegionName }
export interface OAuthTokenResponse { access_token: string; expires_in: number; token_type?: string }
export type ItemIdType = 'ASIN';
export type CreatorsResource =
  | 'images.primary.small' | 'images.primary.medium' | 'images.primary.large' | 'images.primary.highRes'
  | 'images.variants.small' | 'images.variants.medium' | 'images.variants.large' | 'images.variants.highRes'
  | 'itemInfo.title' | 'itemInfo.features' | 'itemInfo.byLineInfo' | 'itemInfo.classifications'
  | 'itemInfo.contentInfo' | 'itemInfo.externalIds' | 'itemInfo.manufactureInfo' | 'itemInfo.productInfo' | 'itemInfo.technicalInfo'
  | 'offersV2.listings.price' | 'offersV2.listings.availability' | 'offersV2.listings.condition'
  | 'offersV2.listings.dealDetails' | 'offersV2.listings.isBuyBoxWinner' | 'offersV2.listings.merchantInfo'
  | 'browseNodeInfo.browseNodes' | 'browseNodeInfo.browseNodes.ancestor' | 'browseNodeInfo.browseNodes.salesRank'
  | 'customerReviews.count' | 'customerReviews.starRating' | 'parentASIN';
export interface GetItemsRequest {
  itemIds: string[]; itemIdType: ItemIdType; marketplace: string; partnerTag: string; resources: CreatorsResource[];
}
export interface SearchItemsParams {
  keywords: string; searchIndex?: string; browseNodeId?: string; itemCount?: number; itemPage?: number;
  minPrice?: number; maxPrice?: number; sortBy?: string;
  minSavingPercent?: number; deliveryFlags?: Array<'Prime'>;
}
export interface ImageSize { url?: string; height?: number; width?: number }
interface ImageSet { small?: ImageSize; medium?: ImageSize; large?: ImageSize; hiRes?: ImageSize }
export interface ItemImages { primary?: ImageSet; variants?: ImageSet[] }
interface DisplayValue { displayValue?: string }
export interface ItemInfo {
  title?: DisplayValue; features?: { displayValues?: string[] };
  byLineInfo?: { brand?: DisplayValue; manufacturer?: DisplayValue };
}
interface Money { amount?: number; currency?: string; displayAmount?: string }
export interface PriceInfo { money?: Money; savings?: { money?: Money; percentage?: number } }
export interface OfferListing {
  price?: PriceInfo; savingBasis?: { money?: Money }; isBuyBoxWinner?: boolean;
  availability?: { message?: string; type?: string };
  dealDetails?: { dealType?: string; dealEndTime?: string };
}
export interface OffersV2 { listings?: OfferListing[] }
export interface CustomerReviews { count?: number; starRating?: { value?: number } }
export interface BrowseNode { id?: string; displayName?: string; contextFreeName?: string }
export interface BrowseNodeInfo { browseNodes?: BrowseNode[] }
export interface CreatorsApiItem {
  asin?: string; detailPageURL?: string; images?: ItemImages; itemInfo?: ItemInfo;
  offersV2?: OffersV2; customerReviews?: CustomerReviews; browseNodeInfo?: BrowseNodeInfo; parentASIN?: string;
}
export interface GetItemsResponse {
  itemsResult?: { items?: CreatorsApiItem[] };
  searchResult?: { items?: CreatorsApiItem[]; totalResultCount?: number };
  errors?: Array<{ code?: string; message?: string }>;
}
export interface CreatorsProductData {
  asin: string; title: string; brand: string | null; price: number | null; originalPrice: number | null;
  currency: string; rating: number | null; totalReviews: number | null; imageUrl: string | null;
  images: string[]; features: string[]; description: string | null; url: string; availability: string | null;
  isBuyBoxWinner: boolean; dealType: string | null; dealEndTime: string | null; categories: string[];
}
export interface CreatorsError { code: string; message: string }
export type CreatorsResult<T> = { success: true; data: T } | { success: false; error: CreatorsError };
export type GetItemsResult = CreatorsResult<CreatorsProductData[]>;
export type SearchItemsResult = { success: true; data: CreatorsProductData[]; totalResults?: number } | { success: false; error: CreatorsError };
// Request only the catalog fields used by the storefront; omit review resources.
export const DEFAULT_RESOURCES: CreatorsResource[] = [
  'images.primary.large', 'images.variants.large', 'itemInfo.title', 'itemInfo.features',
  'itemInfo.byLineInfo', 'offersV2.listings.price', 'offersV2.listings.availability',
  'offersV2.listings.isBuyBoxWinner', 'offersV2.listings.dealDetails', 'browseNodeInfo.browseNodes',
];
