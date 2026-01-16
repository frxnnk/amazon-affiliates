import { defineDb, defineTable, column } from 'astro:db';

// Users table - linked to Clerk user ID
const Users = defineTable({
  columns: {
    id: column.text({ primaryKey: true }), // Clerk user ID
    email: column.text(),
    balance: column.number({ default: 0 }), // Current balance in cents
    totalEarned: column.number({ default: 0 }), // Lifetime earnings in cents
    approvedClaimsCount: column.number({ default: 0 }), // For tier calculation
    tier: column.text({ default: 'bronze' }), // bronze, silver, gold
    paypalEmail: column.text({ optional: true }),
    cryptoAddress: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  },
});

// Purchase claims submitted by users
const PurchaseClaims = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    amazonOrderId: column.text(),
    productSlug: column.text(), // Reference to content collection product
    productTitle: column.text(), // Denormalized for display
    purchaseDate: column.date(),
    claimedAmount: column.number(), // Amount in cents user expects
    approvedAmount: column.number({ optional: true }), // Actual approved amount
    status: column.text({ default: 'pending' }), // pending, approved, rejected
    adminNotes: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
    reviewedAt: column.date({ optional: true }),
    reviewedBy: column.text({ optional: true }), // Admin Clerk ID
  },
});

// Cashback transaction history (immutable audit trail)
const CashbackTransactions = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    type: column.text(), // credit, debit
    amount: column.number(), // Amount in cents (positive for credit, negative for debit)
    description: column.text(),
    referenceType: column.text({ optional: true }), // claim, payout
    referenceId: column.number({ optional: true }), // ID of related claim or payout
    balanceAfter: column.number(), // Balance after this transaction
    createdAt: column.date({ default: new Date() }),
  },
});

// Payout requests
const PayoutRequests = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    amount: column.number(), // Amount in cents
    method: column.text(), // paypal, crypto
    paypalEmail: column.text({ optional: true }),
    cryptoAddress: column.text({ optional: true }),
    status: column.text({ default: 'pending' }), // pending, processing, completed, failed
    adminNotes: column.text({ optional: true }),
    transactionRef: column.text({ optional: true }), // External payment reference
    createdAt: column.date({ default: new Date() }),
    processedAt: column.date({ optional: true }),
    processedBy: column.text({ optional: true }), // Admin Clerk ID
  },
});

// Affiliate click tracking for logged-in users
const AffiliateClicks = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ optional: true, references: () => Users.columns.id }),
    productSlug: column.text(),
    sessionId: column.text({ optional: true }),
    ipHash: column.text({ optional: true }), // Hashed IP for anonymous correlation
    userAgent: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
  },
});

// Deal Agent configuration
const DealAgentConfig = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    key: column.text({ unique: true }), // Setting key
    value: column.json(), // Setting value (flexible)
    updatedAt: column.date({ default: new Date() }),
    updatedBy: column.text({ optional: true }), // Admin Clerk ID
  },
});

// Deal Agent search keywords
const DealAgentKeywords = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    keyword: column.text(),
    category: column.text({ optional: true }),
    marketplace: column.text({ default: 'com' }), // com, es, de, etc.
    isActive: column.boolean({ default: true }),
    lastSearchedAt: column.date({ optional: true }),
    resultsCount: column.number({ default: 0 }),
    createdAt: column.date({ default: new Date() }),
  },
});

// Product Likes - track user likes on products
const ProductLikes = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    asin: column.text(), // Product ASIN for RapidAPI products
    productId: column.text({ optional: true }), // Optional reference to Products table
    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['userId', 'asin'], unique: true }, // One like per user per product
    { on: ['asin'] }, // For counting likes
  ],
});

// Product Reviews - user reviews with ratings on products
const ProductReviews = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    asin: column.text(), // Product ASIN
    productId: column.text({ optional: true }), // Optional reference to Products table

    // Review content
    rating: column.number({ default: 5 }), // 1-5 stars (default 5 for migration)
    title: column.text({ optional: true }), // Review title (max 100 chars)
    content: column.text(), // Review body

    // Verification
    isVerifiedPurchase: column.boolean({ default: false }),
    purchaseClaimId: column.number({ optional: true }), // FK to PurchaseClaims

    // Moderation
    isVisible: column.boolean({ default: true }),
    isApproved: column.boolean({ default: false }), // Requires admin approval
    moderationNote: column.text({ optional: true }),
    moderatedBy: column.text({ optional: true }),
    moderatedAt: column.date({ optional: true }),

    // Metrics (cached)
    helpfulCount: column.number({ default: 0 }),

    // Timestamps
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['asin'] }, // For fetching product reviews
    { on: ['userId'] }, // For fetching user's reviews
    { on: ['asin', 'isVisible', 'isApproved'] }, // For visible approved reviews
    { on: ['rating'] }, // For filtering by rating
  ],
});

// Review Helpful Votes - tracks helpful/not helpful votes on reviews
const ReviewHelpfulVotes = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    reviewId: column.number({ references: () => ProductReviews.columns.id }),
    userId: column.text({ references: () => Users.columns.id }),
    isHelpful: column.boolean({ default: true }), // true = helpful, false = not helpful
    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['reviewId', 'userId'], unique: true }, // One vote per user per review
    { on: ['reviewId'] }, // For counting votes
  ],
});

// Legacy alias for backwards compatibility
const ProductComments = ProductReviews;

// Amazon Reviews - imported reviews from Amazon via RapidAPI
const AmazonReviews = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    asin: column.text(), // Product ASIN
    productId: column.text({ optional: true }), // Optional FK to Products

    // Review content from Amazon
    externalId: column.text(), // Amazon's review ID
    title: column.text({ optional: true }),
    content: column.text(),
    rating: column.number(), // 1-5 stars

    // Reviewer info
    reviewerName: column.text({ optional: true }),
    reviewerUrl: column.text({ optional: true }),

    // Metadata
    isVerifiedPurchase: column.boolean({ default: false }),
    helpfulCount: column.number({ default: 0 }),
    reviewDate: column.text({ optional: true }), // Original date string from Amazon
    images: column.json({ optional: true }), // Array of image URLs

    // Source tracking
    source: column.text({ default: 'rapidapi' }), // 'rapidapi' | 'scraper'
    marketplace: column.text({ default: 'com' }), // Amazon domain

    // Caching
    fetchedAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['asin'] }, // For fetching reviews by product
    { on: ['externalId'], unique: true }, // Prevent duplicates
    { on: ['rating'] }, // For filtering by rating
    { on: ['fetchedAt'] }, // For cache expiration
  ],
});

// Product Search Cache - cache RapidAPI product searches to minimize API calls
// Cache duration: 4 hours for searches, 24 hours for individual products
const ProductSearchCache = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    cacheKey: column.text({ unique: true }), // Hash of search params (keywords + marketplace + page)
    searchType: column.text(), // 'search' | 'product' | 'deals'
    marketplace: column.text({ default: 'com' }),
    
    // Cached response data
    products: column.json(), // Array of product data
    totalResults: column.number({ default: 0 }),
    
    // Cache metadata
    fetchedAt: column.date({ default: new Date() }),
    expiresAt: column.date(), // When this cache entry expires
    hitCount: column.number({ default: 0 }), // How many times served from cache
  },
  indexes: [
    { on: ['cacheKey'], unique: true },
    { on: ['expiresAt'] }, // For cleanup queries
    { on: ['searchType', 'marketplace'] },
  ],
});

// Video Cache - cache YouTube video lookups to minimize API calls
// Cache duration: 30 days for found videos, 7 days for not found
const VideoCache = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    searchKey: column.text({ unique: true }), // Hash of ASIN + normalized title
    asin: column.text({ optional: true }), // Product ASIN
    productTitle: column.text(), // Original product title searched

    // Video data (null if no video found)
    videoId: column.text({ optional: true }),
    videoTitle: column.text({ optional: true }),
    channelTitle: column.text({ optional: true }),
    thumbnail: column.text({ optional: true }),
    thumbnailHigh: column.text({ optional: true }),
    isShort: column.boolean({ default: true }),
    isPremiumChannel: column.boolean({ default: false }), // True if from a known quality tech review channel
    isHidden: column.boolean({ default: false }), // Admin can hide specific videos from appearing

    // Cache metadata
    fetchedAt: column.date({ default: new Date() }),
    expiresAt: column.date(), // When this cache entry expires
    hitCount: column.number({ default: 0 }), // How many times this was served from cache
  },
  indexes: [
    { on: ['asin'] }, // For lookup by product
    { on: ['expiresAt'] }, // For cleanup queries
  ],
});

// User Preferences - for personalized recommendations
const UserPreferences = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id, unique: true }),
    // Quiz responses
    budgetRange: column.text({ optional: true }), // 'low' | 'mid' | 'high' | 'premium'
    categories: column.json({ default: [] }), // string[] of favorite categories
    brands: column.json({ default: [] }), // string[] of favorite brands
    dealSensitivity: column.text({ default: 'medium' }), // 'low' | 'medium' | 'high'
    primeOnly: column.boolean({ default: false }),
    // Swipe learning
    likedAsins: column.json({ default: [] }), // ASINs liked in swipe mode
    dislikedAsins: column.json({ default: [] }), // ASINs rejected in swipe mode
    // Metadata
    quizCompleted: column.boolean({ default: false }),
    lastUpdated: column.date({ optional: true }),
    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['userId'], unique: true },
  ],
});

// Price History - for deal validation
const PriceHistory = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    asin: column.text(),
    marketplace: column.text({ default: 'com' }), // com, es, de, etc.
    price: column.number(),
    originalPrice: column.number({ optional: true }),
    currency: column.text({ default: 'USD' }),
    source: column.text({ default: 'rainforest' }), // 'rainforest' | 'keepa' | 'manual'
    recordedAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['asin', 'marketplace'] },
    { on: ['recordedAt'] },
  ],
});

// Curated Deals - manually or AI-curated deals
const CuratedDeals = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    asin: column.text(),
    marketplace: column.text({ default: 'com' }),
    curationType: column.text(), // 'admin' | 'ai' | 'trending'
    priority: column.number({ default: 0 }), // 0-100, higher = more featured
    reason: column.text({ optional: true }), // Why this is a good deal
    validUntil: column.date({ optional: true }), // Expiration date
    isActive: column.boolean({ default: true }),
    createdBy: column.text({ optional: true }), // Admin ID or 'system'
    aiScore: column.number({ optional: true }), // AI confidence score
    // Cached product data for display
    title: column.text({ optional: true }),
    brand: column.text({ optional: true }),
    price: column.number({ optional: true }),
    originalPrice: column.number({ optional: true }),
    currency: column.text({ optional: true }),
    imageUrl: column.text({ optional: true }),
    affiliateUrl: column.text({ optional: true }),
    rating: column.number({ optional: true }),
    totalReviews: column.number({ optional: true }),
    // Timestamps
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ['asin', 'marketplace'] },
    { on: ['isActive', 'priority'] },
    { on: ['curationType'] },
  ],
});

// Products table - main product catalog
const Products = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    productId: column.text({ unique: true }), // URL slug
    asin: column.text(),
    lang: column.text({ default: 'en' }), // 'es' | 'en'

    // Content - Canonical fields (source of truth)
    title: column.text(),
    brand: column.text(),
    model: column.text({ optional: true }),
    description: column.text(),
    shortDescription: column.text({ optional: true }),

    // Text variants for different contexts
    displayTitle: column.text({ optional: true }),     // Clean UI title (max 60 chars)
    seoTitle: column.text({ optional: true }),         // Meta title (max 70 chars)
    shortTitle: column.text({ optional: true }),       // Badges/compact (max 30 chars)
    metaDescription: column.text({ optional: true }),  // SEO meta (max 160 chars)
    cardDescription: column.text({ optional: true }),  // ProductCard (max 200 chars)
    fullDescription: column.text({ optional: true }),  // Full markdown content

    // Categorization
    category: column.text({ optional: true }),
    subcategory: column.text({ optional: true }),
    tags: column.json({ default: [] }), // string[]

    // Pricing
    price: column.number(), // in currency units (not cents)
    originalPrice: column.number({ optional: true }),
    currency: column.text({ default: 'USD' }),

    // Affiliate
    affiliateUrl: column.text(),

    // Ratings
    rating: column.number({ optional: true }), // 0-5 from Amazon
    totalReviews: column.number({ optional: true }),
    ourRating: column.number({ optional: true }), // 0-10 custom rating

    // Pros/Cons
    pros: column.json({ default: [] }), // string[]
    cons: column.json({ default: [] }), // string[]

    // Specifications
    specifications: column.json({ optional: true }), // Record<string, string>

    // Images
    featuredImageUrl: column.text(),
    featuredImageAlt: column.text({ optional: true }),
    gallery: column.json({ optional: true }), // {url: string, alt: string}[]

    // Markdown content (optional body)
    content: column.text({ optional: true }),

    // Status & Visibility
    status: column.text({ default: 'draft' }), // draft | published | archived
    isFeatured: column.boolean({ default: false }),
    isOnSale: column.boolean({ default: false }),

    // Related products
    relatedProducts: column.json({ optional: true }), // string[] of productIds

    // Timestamps
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
    publishedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ['asin'], unique: false },
    { on: ['lang', 'status'] },
    { on: ['category'] },
  ],
});

// Agent Configuration - per-agent settings and state
const AgentConfig = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    agentType: column.text({ unique: true }), // 'deal_hunter' | 'content_creator' | 'price_monitor' | 'channel_manager'
    isEnabled: column.boolean({ default: true }),
    intervalHours: column.number({ default: 6 }), // How often to run
    lastRunAt: column.date({ optional: true }),
    nextRunAt: column.date({ optional: true }),
    config: column.json({ default: {} }), // Agent-specific configuration
    quotaUsedToday: column.number({ default: 0 }),
    quotaLimit: column.number({ default: 100 }),
    quotaResetAt: column.date({ optional: true }),
    updatedAt: column.date({ default: new Date() }),
  },
});

// Agent Run History - tracks all agent executions
const AgentRunHistory = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    agentType: column.text(),
    status: column.text({ default: 'pending' }), // 'pending' | 'running' | 'completed' | 'failed'
    startedAt: column.date({ optional: true }),
    completedAt: column.date({ optional: true }),
    result: column.json({ optional: true }), // Agent-specific result data
    error: column.text({ optional: true }),
    metrics: column.json({ optional: true }), // { apiCalls, tokensUsed, itemsProcessed }
    triggeredBy: column.text({ default: 'cron' }), // 'cron' | 'manual' | 'api'
  },
  indexes: [
    { on: ['agentType', 'status'] },
    { on: ['startedAt'] },
  ],
});

// Content Queue - pending content generation tasks
const ContentQueue = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    productId: column.number({ optional: true }), // Reference to Products table
    asin: column.text(),
    marketplace: column.text({ default: 'com' }),
    contentType: column.text({ default: 'full' }), // 'full' | 'description' | 'pros_cons' | 'seo'
    status: column.text({ default: 'pending' }), // 'pending' | 'processing' | 'completed' | 'failed'
    priority: column.number({ default: 0 }), // Higher = more important
    attempts: column.number({ default: 0 }),
    maxAttempts: column.number({ default: 3 }),
    generatedContent: column.json({ optional: true }),
    error: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
    processedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ['status', 'priority'] },
    { on: ['asin'] },
  ],
});

// Publish Queue - pending social media posts
const PublishQueue = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    productId: column.number({ optional: true }),
    asin: column.text(),
    marketplace: column.text({ default: 'com' }),
    channels: column.json({ default: [] }), // ['telegram', 'twitter', 'discord']
    status: column.text({ default: 'pending' }), // 'pending' | 'processing' | 'published' | 'partial' | 'failed'
    priority: column.number({ default: 0 }),
    scheduledFor: column.date({ optional: true }), // Future scheduling
    publishResults: column.json({ optional: true }), // Per-channel results { telegram: {success, messageId}, ... }
    contentSnapshot: column.json({ optional: true }), // Cached product data at time of queue
    createdAt: column.date({ default: new Date() }),
    publishedAt: column.date({ optional: true }),
  },
  indexes: [
    { on: ['status', 'scheduledFor'] },
    { on: ['asin'] },
  ],
});

// Price Alerts - price drop notifications
const PriceAlerts = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    asin: column.text(),
    marketplace: column.text({ default: 'com' }),
    productId: column.number({ optional: true }),
    alertType: column.text(), // 'price_drop' | 'lowest_ever' | 'back_in_stock' | 'threshold'
    previousPrice: column.number(),
    currentPrice: column.number(),
    lowestPrice: column.number({ optional: true }),
    dropPercent: column.number(),
    dropAmount: column.number(), // Absolute savings
    currency: column.text({ default: 'USD' }),
    isNotified: column.boolean({ default: false }),
    notifiedChannels: column.json({ default: [] }), // Which channels received notification
    notifiedAt: column.date({ optional: true }),
    expiresAt: column.date({ optional: true }), // Alert validity
    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['asin', 'marketplace'] },
    { on: ['isNotified'] },
    { on: ['alertType'] },
  ],
});

// Social Accounts - connected social media accounts
const SocialAccounts = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    platform: column.text({ unique: true }), // 'telegram' | 'twitter' | 'discord'
    accountId: column.text({ optional: true }), // Platform-specific ID (channel ID, user ID, etc.)
    accountName: column.text({ optional: true }), // Display name
    isEnabled: column.boolean({ default: true }),
    config: column.json({ default: {} }), // Platform-specific settings (language, format, etc.)
    credentials: column.json({ optional: true }), // Encrypted tokens/keys (or reference to env vars)
    lastPostAt: column.date({ optional: true }),
    postCount: column.number({ default: 0 }),
    errorCount: column.number({ default: 0 }), // Consecutive errors
    lastError: column.text({ optional: true }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  },
});

// Product Views - track products seen by users for anti-repetition
// Stores last 200 products per user, older entries auto-expire
const ProductViews = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    asin: column.text(),
    category: column.text({ optional: true }),
    viewedAt: column.date({ default: new Date() }),
    // Engagement metrics
    timeSpentMs: column.number({ optional: true }), // Time on product slide
    interactionType: column.text({ optional: true }), // 'view' | 'click' | 'swipe_left' | 'swipe_right'
  },
  indexes: [
    { on: ['userId', 'asin'] }, // Quick lookup for exclusion
    { on: ['userId', 'viewedAt'] }, // For cleanup of old entries
    { on: ['asin'] }, // For analytics
  ],
});

// Product Similarity Cache - precomputed similarity scores between products
// Stores top 20 similar products for each product
const ProductSimilarity = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    sourceAsin: column.text(), // The product we're finding similar items for
    targetAsin: column.text(), // A similar product
    similarityScore: column.number(), // 0-100 score
    // Score breakdown for explainability
    categoryScore: column.number({ default: 0 }),
    brandScore: column.number({ default: 0 }),
    priceScore: column.number({ default: 0 }),
    ratingScore: column.number({ default: 0 }),
    // Cache metadata
    computedAt: column.date({ default: new Date() }),
    expiresAt: column.date(), // Recompute after this date
  },
  indexes: [
    { on: ['sourceAsin', 'similarityScore'] }, // Get top similar products
    { on: ['sourceAsin', 'targetAsin'], unique: true }, // Dedupe
    { on: ['expiresAt'] }, // Cleanup expired entries
  ],
});

// User Similarity Profile Cache - precomputed user preferences for content-based matching
const UserSimilarityProfile = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id, unique: true }),
    // Aggregated preferences
    preferredCategories: column.json({ default: {} }), // Record<string, weight>
    preferredBrands: column.json({ default: {} }), // Record<string, weight>
    preferredPriceRange: column.text({ optional: true }), // 'budget' | 'mid' | 'premium' | 'luxury'
    preferredRatingTier: column.text({ optional: true }), // 'low' | 'medium' | 'high' | 'excellent'
    // Source data summary
    likesCount: column.number({ default: 0 }),
    viewsCount: column.number({ default: 0 }),
    // Cache metadata
    computedAt: column.date({ default: new Date() }),
    expiresAt: column.date(), // Recompute after this date (e.g., 1 hour)
  },
  indexes: [
    { on: ['userId'], unique: true },
    { on: ['expiresAt'] },
  ],
});

// User-to-User Similarity Cache - for collaborative filtering
// Stores similarity between users based on shared likes
const UserUserSimilarity = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    similarUserId: column.text({ references: () => Users.columns.id }),
    similarity: column.number(), // 0-1 Jaccard index
    sharedLikes: column.number({ default: 0 }), // Number of products both liked
    // Cache metadata
    computedAt: column.date({ default: new Date() }),
    expiresAt: column.date(), // Recompute after this date (e.g., 24 hours)
  },
  indexes: [
    { on: ['userId', 'similarity'] }, // Get similar users sorted by similarity
    { on: ['userId', 'similarUserId'], unique: true }, // Dedupe
    { on: ['expiresAt'] }, // Cleanup
  ],
});

// Product Co-occurrence Cache - products frequently liked together
// "Users who liked X also liked Y"
const ProductCoOccurrence = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    asin1: column.text(), // Source product
    asin2: column.text(), // Co-occurring product
    coOccurrenceCount: column.number({ default: 0 }), // How many users liked both
    confidence: column.number({ default: 0 }), // P(asin2 | asin1)
    // Cache metadata
    computedAt: column.date({ default: new Date() }),
    expiresAt: column.date(), // Recompute after this date
  },
  indexes: [
    { on: ['asin1', 'coOccurrenceCount'] }, // Get top co-occurring products
    { on: ['asin1', 'asin2'], unique: true }, // Dedupe
    { on: ['expiresAt'] }, // Cleanup
  ],
});

// Collaborative Recommendations Cache - precomputed recommendations per user
const CollaborativeRecommendations = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text({ references: () => Users.columns.id }),
    asin: column.text(), // Recommended product
    score: column.number({ default: 0 }), // 0-100 recommendation score
    reason: column.text({ optional: true }), // 'similar_users' | 'frequently_together' | 'trending'
    sourceInfo: column.json({ optional: true }), // Additional context
    // Cache metadata
    computedAt: column.date({ default: new Date() }),
    expiresAt: column.date(), // Recompute after this date (e.g., 6 hours)
  },
  indexes: [
    { on: ['userId', 'score'] }, // Get top recommendations for user
    { on: ['userId', 'asin'], unique: true }, // Dedupe
    { on: ['expiresAt'] }, // Cleanup
  ],
});

// Agent Events - real-time event stream for dashboard
const AgentEvents = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    eventType: column.text(), // 'started' | 'completed' | 'item_processed' | 'error' | 'warning' | 'progress'
    agentType: column.text(), // 'deal_hunter' | 'content_creator' | 'price_monitor' | 'channel_manager' | etc.
    runId: column.number({ optional: true }), // Reference to AgentRunHistory
    message: column.text({ optional: true }), // Human-readable message
    data: column.json({ optional: true }), // Event-specific data (items processed, errors, etc.)
    level: column.text({ default: 'info' }), // 'info' | 'warn' | 'error' | 'success'
    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['createdAt'] }, // For fetching recent events
    { on: ['agentType', 'createdAt'] }, // For filtering by agent
    { on: ['runId'] }, // For fetching events of a specific run
  ],
});

// Agent Heartbeat - live status for each agent
const AgentHeartbeat = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    agentType: column.text({ unique: true }), // One row per agent type
    status: column.text({ default: 'idle' }), // 'idle' | 'running' | 'error' | 'disabled'
    currentRunId: column.number({ optional: true }), // Current AgentRunHistory ID
    currentTask: column.text({ optional: true }), // What the agent is currently doing
    progress: column.number({ optional: true }), // 0-100 percentage
    itemsProcessed: column.number({ default: 0 }), // Items processed in current run
    itemsTotal: column.number({ optional: true }), // Total items to process (if known)
    lastHeartbeat: column.date({ default: new Date() }), // Last update timestamp
    lastError: column.text({ optional: true }), // Last error message
  },
});

// API Usage Tracking - detailed cost and usage tracking per API call
const ApiUsage = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    apiName: column.text(), // 'rapidapi' | 'openai' | 'youtube' | 'telegram' | 'discord' | 'twitter'
    endpoint: column.text({ optional: true }), // Specific endpoint called

    // Usage metrics
    requestCount: column.number({ default: 1 }), // Number of requests
    tokensInput: column.number({ optional: true }), // For OpenAI - input tokens
    tokensOutput: column.number({ optional: true }), // For OpenAI - output tokens

    // Cost tracking (in cents USD)
    costCents: column.number({ default: 0 }), // Actual cost in cents

    // Context
    agentType: column.text({ optional: true }), // Which agent made the call
    runId: column.number({ optional: true }), // Reference to AgentRunHistory
    context: column.json({ optional: true }), // Additional context (keyword, asin, etc.)

    // Response info
    statusCode: column.number({ optional: true }), // HTTP status code
    success: column.boolean({ default: true }),
    errorMessage: column.text({ optional: true }),
    responseTimeMs: column.number({ optional: true }), // Response time in milliseconds

    // Timestamps
    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['apiName', 'createdAt'] }, // For daily/monthly aggregations
    { on: ['agentType', 'createdAt'] }, // For agent-specific reporting
    { on: ['createdAt'] }, // For cleanup
  ],
});

// API Cost Summary - daily aggregated costs per API
const ApiCostSummary = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    apiName: column.text(),
    date: column.text(), // YYYY-MM-DD format

    // Aggregated metrics
    totalRequests: column.number({ default: 0 }),
    totalTokensInput: column.number({ default: 0 }),
    totalTokensOutput: column.number({ default: 0 }),
    totalCostCents: column.number({ default: 0 }),

    // Success/failure tracking
    successCount: column.number({ default: 0 }),
    errorCount: column.number({ default: 0 }),

    // Quota tracking
    quotaLimit: column.number({ optional: true }),
    quotaUsed: column.number({ default: 0 }),

    // Timestamps
    updatedAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['apiName', 'date'], unique: true },
    { on: ['date'] }, // For reports
  ],
});

// ============================================================================
// AGENT SCHEDULING SYSTEM TABLES
// ============================================================================

// Agent Schedule - Weekly recurring schedules for agents
const AgentSchedule = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    agentType: column.text(), // 'deal_hunter' | 'content_creator' | 'price_monitor' | 'channel_manager'
    name: column.text(), // Display name: "Morning Deal Hunt"

    // Schedule pattern (cron-like)
    daysOfWeek: column.json({ default: [1, 2, 3, 4, 5] }), // [0,1,2,3,4,5,6] - 0=Sunday
    hour: column.number(), // 0-23
    minute: column.number({ default: 0 }), // 0-59
    timezone: column.text({ default: 'America/New_York' }),

    // Task configuration
    taskType: column.text({ default: 'routine' }), // 'routine' | 'deep_scan' | 'cleanup'
    config: column.json({ default: {} }), // Task-specific config overrides
    maxItems: column.number({ default: 10 }),
    priority: column.number({ default: 50 }), // 0-100

    // Conditions for execution
    conditions: column.json({ optional: true }), // { queueMinItems: 5, onlyIfIdle: true }

    // State
    isEnabled: column.boolean({ default: true }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
    createdBy: column.text({ optional: true }), // Admin Clerk ID or 'system'
  },
  indexes: [
    { on: ['agentType', 'isEnabled'] },
    { on: ['hour', 'minute'] },
  ],
});

// Agent Task - Individual scheduled or ad-hoc tasks
const AgentTask = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    agentType: column.text(),
    scheduleId: column.number({ optional: true }), // FK to AgentSchedule (null for ad-hoc)

    // Task details
    name: column.text(),
    description: column.text({ optional: true }),
    taskType: column.text({ default: 'routine' }), // 'routine' | 'ad_hoc' | 'conditional'
    config: column.json({ default: {} }),

    // Timing
    scheduledFor: column.date(), // When task should run
    dueBy: column.date({ optional: true }), // Deadline for compliance tracking

    // Dependencies
    dependsOnTaskId: column.number({ optional: true }), // Run after this task completes

    // Status
    status: column.text({ default: 'pending' }), // 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'overdue'
    runId: column.number({ optional: true }), // FK to AgentRunHistory when executed

    // Compliance tracking
    startedAt: column.date({ optional: true }),
    completedAt: column.date({ optional: true }),
    wasOnTime: column.boolean({ optional: true }), // Started before dueBy
    delayMinutes: column.number({ optional: true }), // How late it started

    // Metadata
    priority: column.number({ default: 50 }),
    createdAt: column.date({ default: new Date() }),
    createdBy: column.text({ optional: true }), // 'system' | 'admin' | Clerk ID
  },
  indexes: [
    { on: ['agentType', 'status', 'scheduledFor'] },
    { on: ['scheduledFor'] },
    { on: ['status'] },
    { on: ['scheduleId'] },
  ],
});

// Agent Shift - Define work periods/roles ("Puestos")
const AgentShift = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    name: column.text(), // "Turno Mañana", "Turno Tarde", "Guardia Nocturna"
    description: column.text({ optional: true }),

    // Time window
    startHour: column.number(), // 0-23
    endHour: column.number(), // 0-23
    daysOfWeek: column.json({ default: [1, 2, 3, 4, 5] }), // Weekdays by default
    timezone: column.text({ default: 'America/New_York' }),

    // Agents assigned to this shift
    agents: column.json({ default: [] }), // ['deal_hunter', 'price_monitor']

    // Shift behavior
    maxConcurrentAgents: column.number({ default: 1 }),
    runIntervalMinutes: column.number({ default: 60 }), // Run cycle within shift

    // State
    isEnabled: column.boolean({ default: true }),
    createdAt: column.date({ default: new Date() }),
    updatedAt: column.date({ default: new Date() }),
  },
  indexes: [{ on: ['isEnabled'] }],
});

// Task Completion - Daily compliance tracking aggregates
const TaskCompletion = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    date: column.text(), // YYYY-MM-DD
    agentType: column.text(),

    // Daily metrics
    tasksScheduled: column.number({ default: 0 }),
    tasksCompleted: column.number({ default: 0 }),
    tasksFailed: column.number({ default: 0 }),
    tasksSkipped: column.number({ default: 0 }),

    // Compliance
    onTimeCount: column.number({ default: 0 }),
    lateCount: column.number({ default: 0 }),
    averageDelayMinutes: column.number({ default: 0 }),

    // Performance
    totalDurationMs: column.number({ default: 0 }),
    totalItemsProcessed: column.number({ default: 0 }),

    // Streak tracking
    consecutiveSuccessDays: column.number({ default: 0 }),

    updatedAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['date', 'agentType'] },
    { on: ['agentType'] },
  ],
});

// Agent Alerts - Compliance alerts and notifications
const AgentAlerts = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    agentType: column.text(),
    taskId: column.number({ optional: true }), // FK to AgentTask

    // Alert details
    alertType: column.text(), // 'task_delayed' | 'task_failed' | 'streak_broken' | 'low_performance'
    severity: column.text({ default: 'warning' }), // 'info' | 'warning' | 'error' | 'critical'
    message: column.text(),
    data: column.json({ optional: true }), // Alert-specific data

    // Status
    isRead: column.boolean({ default: false }),
    isResolved: column.boolean({ default: false }),
    resolvedAt: column.date({ optional: true }),
    resolvedBy: column.text({ optional: true }),

    // Notification tracking
    notifiedChannels: column.json({ default: [] }), // ['dashboard', 'telegram', 'email']
    notifiedAt: column.date({ optional: true }),

    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['agentType', 'isRead'] },
    { on: ['alertType', 'createdAt'] },
    { on: ['isResolved'] },
  ],
});

export default defineDb({
  tables: {
    Users,
    PurchaseClaims,
    CashbackTransactions,
    PayoutRequests,
    AffiliateClicks,
    Products,
    DealAgentConfig,
    DealAgentKeywords,
    ProductLikes,
    ProductReviews,
    ReviewHelpfulVotes,
    AmazonReviews,
    ProductComments, // Legacy alias
    UserPreferences,
    PriceHistory,
    CuratedDeals,
    ProductSearchCache,
    VideoCache,
    ProductViews,
    // Content-Based Similarity Tables
    ProductSimilarity,
    UserSimilarityProfile,
    // Collaborative Filtering Tables
    UserUserSimilarity,
    ProductCoOccurrence,
    CollaborativeRecommendations,
    // Multi-Agent System Tables
    AgentConfig,
    AgentRunHistory,
    ContentQueue,
    PublishQueue,
    PriceAlerts,
    SocialAccounts,
    // Real-Time Dashboard Tables
    AgentEvents,
    AgentHeartbeat,
    // API Cost Tracking Tables
    ApiUsage,
    ApiCostSummary,
    // Agent Scheduling System Tables
    AgentSchedule,
    AgentTask,
    AgentShift,
    TaskCompletion,
    AgentAlerts,
  },
});
