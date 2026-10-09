import type { CreatorsApiItem, CreatorsProductData, ImageSize } from './types';
const text = (value: unknown): string | null => typeof value === 'string' && value.length ? value : null;
const amount = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const image = (value?: { large?: ImageSize; medium?: ImageSize; small?: ImageSize; hiRes?: ImageSize }): string | null =>
  text(value?.large?.url) || text(value?.medium?.url) || text(value?.small?.url) || text(value?.hiRes?.url);

export function parseCreatorsItem(item: CreatorsApiItem): CreatorsProductData | null {
  if (!item || typeof item.asin !== 'string' || !/^[A-Z0-9]{10}$/.test(item.asin)) return null;
  const info = item.itemInfo;
  const listings = Array.isArray(item.offersV2?.listings) ? item.offersV2.listings : [];
  const listing = listings.find(value => value.isBuyBoxWinner) || listings[0];
  const price = amount(listing?.price?.money?.amount);
  const savings = amount(listing?.price?.savings?.money?.amount);
  const basis = amount(listing?.savingBasis?.money?.amount);
  const candidateOriginal = basis ?? (price !== null && savings !== null ? price + savings : null);
  const originalPrice = price !== null && candidateOriginal !== null && candidateOriginal > price ? candidateOriginal : null;
  const variants = Array.isArray(item.images?.variants) ? item.images.variants : [];
  const images = [...new Set([image(item.images?.primary), ...variants.map(image)].filter((value): value is string => value !== null))].slice(0, 8);
  const features = Array.isArray(info?.features?.displayValues) ? info.features.displayValues.filter((value): value is string => typeof value === 'string') : [];
  const nodes = Array.isArray(item.browseNodeInfo?.browseNodes) ? item.browseNodeInfo.browseNodes : [];
  return {
    asin: item.asin, title: text(info?.title?.displayValue) || '',
    brand: text(info?.byLineInfo?.brand?.displayValue) || text(info?.byLineInfo?.manufacturer?.displayValue),
    price, originalPrice, currency: text(listing?.price?.money?.currency) || '',
    rating: amount(item.customerReviews?.starRating?.value), totalReviews: amount(item.customerReviews?.count),
    imageUrl: images[0] || null, images, features, description: features.slice(0, 3).join(' ') || null,
    // Preserve Amazon's attribution URL verbatim, including its additional query parameters.
    url: text(item.detailPageURL) || '', availability: text(listing?.availability?.message),
    isBuyBoxWinner: listing?.isBuyBoxWinner === true,
    dealType: text(listing?.dealDetails?.dealType), dealEndTime: text(listing?.dealDetails?.dealEndTime),
    categories: nodes.map(value => text(value.displayName)).filter((value): value is string => value !== null),
  };
}
