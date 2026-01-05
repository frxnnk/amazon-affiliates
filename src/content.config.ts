import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro:schema";

// Schema para Productos
const productsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    productId: z.string(),
    asin: z.string(),
    lang: z.enum(["es", "en"]),

    title: z.string(),
    brand: z.string(),
    model: z.string().optional(),
    description: z.string(),
    shortDescription: z.string(),

    category: z.string(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()),

    price: z.number(),
    originalPrice: z.number().optional(),
    currency: z.enum(["EUR", "USD"]).default("EUR"),
    affiliateUrl: z.string().url(),

    rating: z.number().min(0).max(5),
    totalReviews: z.number().default(0),
    ourRating: z.number().min(0).max(10).optional(),

    pros: z.array(z.string()),
    cons: z.array(z.string()),
    specifications: z.record(z.string(), z.string()).optional(),

    featuredImage: z.object({
      url: z.string(),
      alt: z.string(),
    }),
    gallery: z.array(z.object({
      url: z.string(),
      alt: z.string(),
    })).optional(),

    status: z.enum(["draft", "published", "archived"]).default("published"),
    isFeatured: z.boolean().default(false),
    isOnSale: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),

    relatedProducts: z.array(z.string()).optional(),
  }),
});

// Schema para Reviews
const reviewsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/reviews" }),
  schema: z.object({
    reviewId: z.string(),
    lang: z.enum(["es", "en"]),

    title: z.string(),
    excerpt: z.string(),

    productId: z.string(),

    overallScore: z.number().min(0).max(10),
    scores: z.object({
      quality: z.number().min(0).max(10),
      value: z.number().min(0).max(10),
      features: z.number().min(0).max(10),
      easeOfUse: z.number().min(0).max(10),
    }),

    verdict: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),

    author: z.object({
      name: z.string(),
      avatar: z.string().optional(),
    }),

    featuredImage: z.object({
      url: z.string(),
      alt: z.string(),
    }),

    status: z.enum(["draft", "published"]).default("published"),
    isFeatured: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),

    category: z.string(),
    tags: z.array(z.string()),
  }),
});

// Schema para Listas Curadas (Wishlists)
const listsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/lists" }),
  schema: z.object({
    listId: z.string(),
    lang: z.enum(["es", "en"]),

    title: z.string(),
    subtitle: z.string().optional(),
    excerpt: z.string(),

    listType: z.enum(["best-of", "comparison", "guide", "top-picks"]),
    visibility: z.enum(["public", "private"]).default("public"),

    products: z.array(z.object({
      productId: z.string(),
      position: z.number(),
      badge: z.string().optional(),
      miniReview: z.string().optional(),
    })),

    featuredImage: z.object({
      url: z.string(),
      alt: z.string(),
    }),

    author: z.object({
      name: z.string(),
      avatar: z.string().optional(),
    }),

    status: z.enum(["draft", "published"]).default("published"),
    isFeatured: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),

    category: z.string(),
    tags: z.array(z.string()),
  }),
});

// Schema para Ofertas/Deals
const dealsCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/deals" }),
  schema: z.object({
    dealId: z.string(),
    lang: z.enum(["es", "en"]),

    title: z.string(),
    description: z.string(),

    dealType: z.enum(["flash", "daily", "weekly", "seasonal", "coupon"]),

    productId: z.string().optional(),
    products: z.array(z.string()).optional(),

    discountType: z.enum(["percentage", "fixed", "coupon"]),
    discountValue: z.number(),
    couponCode: z.string().optional(),

    originalPrice: z.number(),
    dealPrice: z.number(),
    currency: z.enum(["EUR", "USD"]).default("EUR"),

    startsAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
    isActive: z.boolean().default(true),

    featuredImage: z.object({
      url: z.string(),
      alt: z.string(),
    }),

    status: z.enum(["draft", "published", "expired"]).default("published"),
    isFeatured: z.boolean().default(false),

    category: z.string(),
    tags: z.array(z.string()),
  }),
});

// Schema para Paginas legales y estaticas
const pagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    pageId: z.string(),
    lang: z.enum(["es", "en"]),
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }),
});

// Schema para Blog/Articulos
const blogCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    articleId: z.string(),
    lang: z.enum(["es", "en"]),

    title: z.string(),
    excerpt: z.string(),

    author: z.object({
      name: z.string(),
      avatar: z.string().optional(),
      bio: z.string().optional(),
    }),

    featuredImage: z.object({
      url: z.string(),
      alt: z.string(),
    }),

    category: z.string(),
    tags: z.array(z.string()),

    status: z.enum(["draft", "published"]).default("published"),
    isFeatured: z.boolean().default(false),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),

    readingTime: z.number().optional(), // in minutes
    relatedArticles: z.array(z.string()).optional(),
    relatedProducts: z.array(z.string()).optional(),
  }),
});

export const collections = {
  products: productsCollection,
  reviews: reviewsCollection,
  lists: listsCollection,
  deals: dealsCollection,
  pages: pagesCollection,
  blog: blogCollection,
};
