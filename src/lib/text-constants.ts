/**
 * Text length limits for product content
 * Used for validation, truncation, and auto-generation
 */
export const TEXT_LIMITS = {
  // Titles
  DISPLAY_TITLE_MAX: 60,    // Clean UI title
  SEO_TITLE_MAX: 70,        // Meta title for search engines
  SHORT_TITLE_MAX: 30,      // Ultra-short for badges/compact cards
  CANONICAL_TITLE_MAX: 200, // Source title from Amazon

  // Descriptions
  META_DESCRIPTION_MAX: 160,  // SEO meta description
  CARD_DESCRIPTION_MAX: 200,  // ProductCard preview
  FULL_DESCRIPTION_MIN: 50,   // Minimum for full description

  // Reviews
  REVIEW_TITLE_MAX: 100,
  REVIEW_CONTENT_MIN: 50,
  REVIEW_CONTENT_MAX: 2000,
} as const;

/**
 * Validation error messages per language
 */
export const TEXT_ERRORS = {
  en: {
    displayTitleTooLong: `Display title must be ${TEXT_LIMITS.DISPLAY_TITLE_MAX} characters or less`,
    seoTitleTooLong: `SEO title must be ${TEXT_LIMITS.SEO_TITLE_MAX} characters or less`,
    shortTitleTooLong: `Short title must be ${TEXT_LIMITS.SHORT_TITLE_MAX} characters or less`,
    metaDescriptionTooLong: `Meta description must be ${TEXT_LIMITS.META_DESCRIPTION_MAX} characters or less`,
    cardDescriptionTooLong: `Card description must be ${TEXT_LIMITS.CARD_DESCRIPTION_MAX} characters or less`,
    reviewTitleTooLong: `Review title must be ${TEXT_LIMITS.REVIEW_TITLE_MAX} characters or less`,
    reviewContentTooShort: `Review must be at least ${TEXT_LIMITS.REVIEW_CONTENT_MIN} characters`,
    reviewContentTooLong: `Review must be ${TEXT_LIMITS.REVIEW_CONTENT_MAX} characters or less`,
  },
  es: {
    displayTitleTooLong: `El título de visualización debe tener ${TEXT_LIMITS.DISPLAY_TITLE_MAX} caracteres o menos`,
    seoTitleTooLong: `El título SEO debe tener ${TEXT_LIMITS.SEO_TITLE_MAX} caracteres o menos`,
    shortTitleTooLong: `El título corto debe tener ${TEXT_LIMITS.SHORT_TITLE_MAX} caracteres o menos`,
    metaDescriptionTooLong: `La meta descripción debe tener ${TEXT_LIMITS.META_DESCRIPTION_MAX} caracteres o menos`,
    cardDescriptionTooLong: `La descripción de tarjeta debe tener ${TEXT_LIMITS.CARD_DESCRIPTION_MAX} caracteres o menos`,
    reviewTitleTooLong: `El título de la reseña debe tener ${TEXT_LIMITS.REVIEW_TITLE_MAX} caracteres o menos`,
    reviewContentTooShort: `La reseña debe tener al menos ${TEXT_LIMITS.REVIEW_CONTENT_MIN} caracteres`,
    reviewContentTooLong: `La reseña debe tener ${TEXT_LIMITS.REVIEW_CONTENT_MAX} caracteres o menos`,
  },
} as const;

export type TextErrorKey = keyof typeof TEXT_ERRORS.en;
export type SupportedLang = keyof typeof TEXT_ERRORS;
