import { TEXT_LIMITS } from './text-constants';

type Lang = 'en' | 'es';

/**
 * Smart truncation that doesn't cut words
 * Finds last complete word before limit
 */
export function truncateAtWord(text: string, maxLength: number, ellipsis = '...'): string {
  if (!text || text.length <= maxLength) return text || '';

  const truncated = text.substring(0, maxLength - ellipsis.length);
  const lastSpace = truncated.lastIndexOf(' ');

  // If we found a space in the latter half, cut there
  if (lastSpace > maxLength * 0.5) {
    return truncated.substring(0, lastSpace).trimEnd() + ellipsis;
  }

  // Otherwise just cut at max length
  return truncated.trimEnd() + ellipsis;
}

/**
 * Smart truncation that tries to end at sentence boundary
 */
export function truncateAtSentence(text: string, maxLength: number, ellipsis = '...'): string {
  if (!text || text.length <= maxLength) return text || '';

  const truncated = text.substring(0, maxLength - ellipsis.length);

  // Try to find sentence end
  const sentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );

  // If we found a sentence end in the latter 60%, use it
  if (sentenceEnd > maxLength * 0.6) {
    return truncated.substring(0, sentenceEnd + 1);
  }

  // Fall back to word truncation
  return truncateAtWord(text, maxLength, ellipsis);
}

/**
 * Strip markdown formatting for plain text
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  return markdown
    .replace(/#{1,6}\s*/g, '') // Headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/__(.+?)__/g, '$1') // Bold alt
    .replace(/_(.+?)_/g, '$1') // Italic alt
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
    .replace(/`{1,3}(.+?)`{1,3}/g, '$1') // Code
    .replace(/^\s*[-*+]\s+/gm, '') // List items
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .replace(/^\s*>\s*/gm, '') // Blockquotes
    .replace(/\n{2,}/g, ' ') // Multiple newlines
    .replace(/\n/g, ' ') // Single newlines
    .replace(/\s+/g, ' ') // Multiple spaces
    .trim();
}

/**
 * Clean Amazon title noise
 */
function cleanAmazonTitle(title: string): string {
  return title
    .replace(/\s*-\s*Amazon\.com\s*$/i, '')
    .replace(/\s*\|\s*Amazon\s*$/i, '')
    .replace(/\[.*?\]/g, '') // Remove [bracketed] text
    .replace(/\(.*?pack.*?\)/gi, '') // Remove (pack of X)
    .replace(/\s{2,}/g, ' ') // Multiple spaces
    .trim();
}

/**
 * Generate display title from canonical title
 * Clean, readable title for UI (max 60 chars)
 */
export function generateDisplayTitle(title: string, brand?: string): string {
  if (!title) return '';

  let displayTitle = cleanAmazonTitle(title);

  return truncateAtWord(displayTitle, TEXT_LIMITS.DISPLAY_TITLE_MAX);
}

/**
 * Generate SEO-optimized title
 * Includes brand for better search visibility (max 70 chars)
 */
export function generateSeoTitle(title: string, brand?: string, category?: string): string {
  if (!title) return '';

  let seoTitle = cleanAmazonTitle(title);

  // Remove parenthetical content for cleaner SEO
  seoTitle = seoTitle.replace(/\(.*?\)/g, '').trim();

  // Ensure brand is included for SEO
  if (brand && !seoTitle.toLowerCase().includes(brand.toLowerCase())) {
    seoTitle = `${brand} ${seoTitle}`;
  }

  return truncateAtWord(seoTitle, TEXT_LIMITS.SEO_TITLE_MAX);
}

/**
 * Generate short title for badges/compact views
 * Ultra-short, just the essential product name (max 30 chars)
 */
export function generateShortTitle(title: string, brand?: string): string {
  if (!title) return '';

  let shortTitle = cleanAmazonTitle(title);

  // Remove brand from start if present
  if (brand) {
    const brandRegex = new RegExp(`^${escapeRegExp(brand)}\\s*[-:]?\\s*`, 'i');
    shortTitle = shortTitle.replace(brandRegex, '');
  }

  // Remove everything after dash or comma
  shortTitle = shortTitle
    .replace(/\s*-\s*.*$/, '')
    .replace(/\s*,\s*.*$/, '')
    .trim();

  // Remove specs like "256GB", "15 inch", etc.
  shortTitle = shortTitle
    .replace(/\d+\s*(GB|TB|MB|inch|"|'|mm|cm|W|mAh)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return truncateAtWord(shortTitle, TEXT_LIMITS.SHORT_TITLE_MAX);
}

/**
 * Generate meta description from full description
 * SEO-optimized, actionable (max 160 chars)
 */
export function generateMetaDescription(
  description: string,
  title: string,
  lang: Lang
): string {
  if (!description) {
    // Fallback: create from title
    const prefix = lang === 'es' ? 'Descubre' : 'Discover';
    const suffix = lang === 'es' ? 'al mejor precio' : 'at the best price';
    return truncateAtWord(`${prefix} ${title} ${suffix}`, TEXT_LIMITS.META_DESCRIPTION_MAX);
  }

  const plainText = stripMarkdown(description);
  return truncateAtSentence(plainText, TEXT_LIMITS.META_DESCRIPTION_MAX);
}

/**
 * Generate card description for ProductCard
 * Concise preview text (max 200 chars)
 */
export function generateCardDescription(description: string): string {
  if (!description) return '';

  const plainText = stripMarkdown(description);
  return truncateAtSentence(plainText, TEXT_LIMITS.CARD_DESCRIPTION_MAX);
}

/**
 * Auto-generate all text variants from canonical title and description
 */
export interface TextVariants {
  displayTitle: string;
  seoTitle: string;
  shortTitle: string;
  metaDescription: string;
  cardDescription: string;
}

export function generateTextVariants(
  title: string,
  description: string,
  options: {
    brand?: string;
    category?: string;
    lang: Lang;
  }
): TextVariants {
  return {
    displayTitle: generateDisplayTitle(title, options.brand),
    seoTitle: generateSeoTitle(title, options.brand, options.category),
    shortTitle: generateShortTitle(title, options.brand),
    metaDescription: generateMetaDescription(description, title, options.lang),
    cardDescription: generateCardDescription(description),
  };
}

/**
 * Validate text lengths
 */
export interface TextValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTextLengths(data: {
  displayTitle?: string;
  seoTitle?: string;
  shortTitle?: string;
  metaDescription?: string;
  cardDescription?: string;
  reviewTitle?: string;
  reviewContent?: string;
}): TextValidationResult {
  const errors: string[] = [];

  if (data.displayTitle && data.displayTitle.length > TEXT_LIMITS.DISPLAY_TITLE_MAX) {
    errors.push(`displayTitle exceeds ${TEXT_LIMITS.DISPLAY_TITLE_MAX} chars`);
  }
  if (data.seoTitle && data.seoTitle.length > TEXT_LIMITS.SEO_TITLE_MAX) {
    errors.push(`seoTitle exceeds ${TEXT_LIMITS.SEO_TITLE_MAX} chars`);
  }
  if (data.shortTitle && data.shortTitle.length > TEXT_LIMITS.SHORT_TITLE_MAX) {
    errors.push(`shortTitle exceeds ${TEXT_LIMITS.SHORT_TITLE_MAX} chars`);
  }
  if (data.metaDescription && data.metaDescription.length > TEXT_LIMITS.META_DESCRIPTION_MAX) {
    errors.push(`metaDescription exceeds ${TEXT_LIMITS.META_DESCRIPTION_MAX} chars`);
  }
  if (data.cardDescription && data.cardDescription.length > TEXT_LIMITS.CARD_DESCRIPTION_MAX) {
    errors.push(`cardDescription exceeds ${TEXT_LIMITS.CARD_DESCRIPTION_MAX} chars`);
  }
  if (data.reviewTitle && data.reviewTitle.length > TEXT_LIMITS.REVIEW_TITLE_MAX) {
    errors.push(`reviewTitle exceeds ${TEXT_LIMITS.REVIEW_TITLE_MAX} chars`);
  }
  if (data.reviewContent) {
    if (data.reviewContent.length < TEXT_LIMITS.REVIEW_CONTENT_MIN) {
      errors.push(`reviewContent below ${TEXT_LIMITS.REVIEW_CONTENT_MIN} chars minimum`);
    }
    if (data.reviewContent.length > TEXT_LIMITS.REVIEW_CONTENT_MAX) {
      errors.push(`reviewContent exceeds ${TEXT_LIMITS.REVIEW_CONTENT_MAX} chars`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper to escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
