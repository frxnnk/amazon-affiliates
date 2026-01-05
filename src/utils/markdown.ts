import yaml from 'js-yaml';

export interface ProductFrontmatter {
  productId: string;
  asin: string;
  lang: 'es' | 'en';
  title: string;
  brand: string;
  model?: string;
  description: string;
  shortDescription: string;
  category: string;
  subcategory?: string;
  tags: string[];
  price: number;
  originalPrice?: number;
  currency: 'EUR' | 'USD';
  affiliateUrl: string;
  rating: number;
  totalReviews?: number;
  ourRating?: number;
  pros: string[];
  cons: string[];
  specifications?: Record<string, string>;
  featuredImage: { url: string; alt: string };
  gallery?: { url: string; alt: string }[];
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  isOnSale: boolean;
  publishedAt: string;
  updatedAt: string;
  relatedProducts?: string[];
}

export interface ListFrontmatter {
  listId: string;
  lang: 'es' | 'en';
  title: string;
  subtitle?: string;
  excerpt: string;
  listType: 'best-of' | 'comparison' | 'guide' | 'top-picks';
  visibility: 'public' | 'private';
  products: {
    productId: string;
    position: number;
    badge?: string;
    miniReview?: string;
  }[];
  featuredImage: { url: string; alt: string };
  author: { name: string; avatar?: string };
  status: 'draft' | 'published';
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
  category: string;
  tags: string[];
}

export function generateProductMarkdown(
  frontmatter: ProductFrontmatter,
  content: string = ''
): string {
  const yamlContent = yaml.dump(frontmatter, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true,
  });

  return `---\n${yamlContent}---\n\n${content}`;
}

export function generateListMarkdown(
  frontmatter: ListFrontmatter,
  content: string = ''
): string {
  const yamlContent = yaml.dump(frontmatter, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true,
  });

  return `---\n${yamlContent}---\n\n${content}`;
}

export function generateProductFilename(productId: string, lang: string): string {
  return `src/content/products/${lang}/${productId}.md`;
}

export function generateListFilename(listId: string, lang: string): string {
  return `src/content/lists/${lang}/${listId}.md`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseMarkdownFrontmatter<T>(markdown: string): { frontmatter: T; content: string } | null {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) return null;

  try {
    const frontmatter = yaml.load(match[1]) as T;
    const content = match[2] || '';
    return { frontmatter, content };
  } catch {
    return null;
  }
}
