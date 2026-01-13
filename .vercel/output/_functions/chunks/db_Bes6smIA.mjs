import { asDrizzleTable } from "@astrojs/db/runtime";
import { createClient } from "@astrojs/db/db-client/libsql-node.js";
import { and, desc, eq } from "@astrojs/db/dist/runtime/virtual.js";
const db = await createClient({
  url: void 0,
  token: process.env.ASTRO_DB_APP_TOKEN
});
const Users = asDrizzleTable("Users", { "columns": { "id": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "Users", "primaryKey": true } }, "email": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "email", "collection": "Users", "primaryKey": false, "optional": false } }, "balance": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "balance", "collection": "Users", "primaryKey": false, "optional": false, "default": 0 } }, "totalEarned": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "totalEarned", "collection": "Users", "primaryKey": false, "optional": false, "default": 0 } }, "approvedClaimsCount": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "approvedClaimsCount", "collection": "Users", "primaryKey": false, "optional": false, "default": 0 } }, "tier": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "tier", "collection": "Users", "default": "bronze", "primaryKey": false, "optional": false } }, "paypalEmail": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "paypalEmail", "collection": "Users", "primaryKey": false, "optional": true } }, "cryptoAddress": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "cryptoAddress", "collection": "Users", "primaryKey": false, "optional": true } }, "createdAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "createdAt", "collection": "Users", "default": "2026-01-13T22:49:27.940Z" } }, "updatedAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "updatedAt", "collection": "Users", "default": "2026-01-13T22:49:27.940Z" } } }, "deprecated": false, "indexes": {} }, false);
const PurchaseClaims = asDrizzleTable("PurchaseClaims", { "columns": { "id": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "PurchaseClaims", "primaryKey": true } }, "userId": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "userId", "collection": "PurchaseClaims", "primaryKey": false, "optional": false, "references": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "Users", "primaryKey": true } } } }, "amazonOrderId": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "amazonOrderId", "collection": "PurchaseClaims", "primaryKey": false, "optional": false } }, "productSlug": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "productSlug", "collection": "PurchaseClaims", "primaryKey": false, "optional": false } }, "productTitle": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "productTitle", "collection": "PurchaseClaims", "primaryKey": false, "optional": false } }, "purchaseDate": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "purchaseDate", "collection": "PurchaseClaims" } }, "claimedAmount": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "claimedAmount", "collection": "PurchaseClaims", "primaryKey": false, "optional": false } }, "approvedAmount": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "approvedAmount", "collection": "PurchaseClaims", "primaryKey": false, "optional": true } }, "status": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "status", "collection": "PurchaseClaims", "default": "pending", "primaryKey": false, "optional": false } }, "adminNotes": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "adminNotes", "collection": "PurchaseClaims", "primaryKey": false, "optional": true } }, "createdAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "createdAt", "collection": "PurchaseClaims", "default": "2026-01-13T22:49:27.940Z" } }, "reviewedAt": { "type": "date", "schema": { "optional": true, "unique": false, "deprecated": false, "name": "reviewedAt", "collection": "PurchaseClaims" } }, "reviewedBy": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "reviewedBy", "collection": "PurchaseClaims", "primaryKey": false, "optional": true } } }, "deprecated": false, "indexes": {} }, false);
const CashbackTransactions = asDrizzleTable("CashbackTransactions", { "columns": { "id": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "CashbackTransactions", "primaryKey": true } }, "userId": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "userId", "collection": "CashbackTransactions", "primaryKey": false, "optional": false, "references": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "Users", "primaryKey": true } } } }, "type": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "type", "collection": "CashbackTransactions", "primaryKey": false, "optional": false } }, "amount": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "amount", "collection": "CashbackTransactions", "primaryKey": false, "optional": false } }, "description": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "description", "collection": "CashbackTransactions", "primaryKey": false, "optional": false } }, "referenceType": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "referenceType", "collection": "CashbackTransactions", "primaryKey": false, "optional": true } }, "referenceId": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "referenceId", "collection": "CashbackTransactions", "primaryKey": false, "optional": true } }, "balanceAfter": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "balanceAfter", "collection": "CashbackTransactions", "primaryKey": false, "optional": false } }, "createdAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "createdAt", "collection": "CashbackTransactions", "default": "2026-01-13T22:49:27.940Z" } } }, "deprecated": false, "indexes": {} }, false);
const PayoutRequests = asDrizzleTable("PayoutRequests", { "columns": { "id": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "PayoutRequests", "primaryKey": true } }, "userId": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "userId", "collection": "PayoutRequests", "primaryKey": false, "optional": false, "references": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "Users", "primaryKey": true } } } }, "amount": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "amount", "collection": "PayoutRequests", "primaryKey": false, "optional": false } }, "method": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "method", "collection": "PayoutRequests", "primaryKey": false, "optional": false } }, "paypalEmail": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "paypalEmail", "collection": "PayoutRequests", "primaryKey": false, "optional": true } }, "cryptoAddress": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "cryptoAddress", "collection": "PayoutRequests", "primaryKey": false, "optional": true } }, "status": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "status", "collection": "PayoutRequests", "default": "pending", "primaryKey": false, "optional": false } }, "adminNotes": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "adminNotes", "collection": "PayoutRequests", "primaryKey": false, "optional": true } }, "transactionRef": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "transactionRef", "collection": "PayoutRequests", "primaryKey": false, "optional": true } }, "createdAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "createdAt", "collection": "PayoutRequests", "default": "2026-01-13T22:49:27.940Z" } }, "processedAt": { "type": "date", "schema": { "optional": true, "unique": false, "deprecated": false, "name": "processedAt", "collection": "PayoutRequests" } }, "processedBy": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "processedBy", "collection": "PayoutRequests", "primaryKey": false, "optional": true } } }, "deprecated": false, "indexes": {} }, false);
const AffiliateClicks = asDrizzleTable("AffiliateClicks", { "columns": { "id": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "AffiliateClicks", "primaryKey": true } }, "userId": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "userId", "collection": "AffiliateClicks", "primaryKey": false, "optional": true, "references": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "Users", "primaryKey": true } } } }, "productSlug": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "productSlug", "collection": "AffiliateClicks", "primaryKey": false, "optional": false } }, "sessionId": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "sessionId", "collection": "AffiliateClicks", "primaryKey": false, "optional": true } }, "ipHash": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "ipHash", "collection": "AffiliateClicks", "primaryKey": false, "optional": true } }, "userAgent": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "userAgent", "collection": "AffiliateClicks", "primaryKey": false, "optional": true } }, "createdAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "createdAt", "collection": "AffiliateClicks", "default": "2026-01-13T22:49:27.940Z" } } }, "deprecated": false, "indexes": {} }, false);
const Products = asDrizzleTable("Products", { "columns": { "id": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "id", "collection": "Products", "primaryKey": true } }, "productId": { "type": "text", "schema": { "unique": true, "deprecated": false, "name": "productId", "collection": "Products", "primaryKey": false, "optional": false } }, "asin": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "asin", "collection": "Products", "primaryKey": false, "optional": false } }, "lang": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "lang", "collection": "Products", "default": "en", "primaryKey": false, "optional": false } }, "title": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "title", "collection": "Products", "primaryKey": false, "optional": false } }, "brand": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "brand", "collection": "Products", "primaryKey": false, "optional": false } }, "model": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "model", "collection": "Products", "primaryKey": false, "optional": true } }, "description": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "description", "collection": "Products", "primaryKey": false, "optional": false } }, "shortDescription": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "shortDescription", "collection": "Products", "primaryKey": false, "optional": true } }, "category": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "category", "collection": "Products", "primaryKey": false, "optional": true } }, "subcategory": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "subcategory", "collection": "Products", "primaryKey": false, "optional": true } }, "tags": { "type": "json", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "tags", "collection": "Products", "default": [] } }, "price": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "price", "collection": "Products", "primaryKey": false, "optional": false } }, "originalPrice": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "originalPrice", "collection": "Products", "primaryKey": false, "optional": true } }, "currency": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "currency", "collection": "Products", "default": "USD", "primaryKey": false, "optional": false } }, "affiliateUrl": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "affiliateUrl", "collection": "Products", "primaryKey": false, "optional": false } }, "rating": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "rating", "collection": "Products", "primaryKey": false, "optional": true } }, "totalReviews": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "totalReviews", "collection": "Products", "primaryKey": false, "optional": true } }, "ourRating": { "type": "number", "schema": { "unique": false, "deprecated": false, "name": "ourRating", "collection": "Products", "primaryKey": false, "optional": true } }, "pros": { "type": "json", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "pros", "collection": "Products", "default": [] } }, "cons": { "type": "json", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "cons", "collection": "Products", "default": [] } }, "specifications": { "type": "json", "schema": { "optional": true, "unique": false, "deprecated": false, "name": "specifications", "collection": "Products" } }, "featuredImageUrl": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "featuredImageUrl", "collection": "Products", "primaryKey": false, "optional": false } }, "featuredImageAlt": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "featuredImageAlt", "collection": "Products", "primaryKey": false, "optional": true } }, "gallery": { "type": "json", "schema": { "optional": true, "unique": false, "deprecated": false, "name": "gallery", "collection": "Products" } }, "content": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "content", "collection": "Products", "primaryKey": false, "optional": true } }, "status": { "type": "text", "schema": { "unique": false, "deprecated": false, "name": "status", "collection": "Products", "default": "draft", "primaryKey": false, "optional": false } }, "isFeatured": { "type": "boolean", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "isFeatured", "collection": "Products", "default": false } }, "isOnSale": { "type": "boolean", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "isOnSale", "collection": "Products", "default": false } }, "relatedProducts": { "type": "json", "schema": { "optional": true, "unique": false, "deprecated": false, "name": "relatedProducts", "collection": "Products" } }, "createdAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "createdAt", "collection": "Products", "default": "2026-01-13T22:49:27.941Z" } }, "updatedAt": { "type": "date", "schema": { "optional": false, "unique": false, "deprecated": false, "name": "updatedAt", "collection": "Products", "default": "2026-01-13T22:49:27.941Z" } }, "publishedAt": { "type": "date", "schema": { "optional": true, "unique": false, "deprecated": false, "name": "publishedAt", "collection": "Products" } } }, "indexes": { "Products_asin_idx": { "on": ["asin"], "unique": false }, "Products_lang_status_idx": { "on": ["lang", "status"] }, "Products_category_idx": { "on": ["category"] } }, "deprecated": false }, false);
const TIER_THRESHOLDS = {
  silver: 10,
  // 10+ approved claims
  gold: 50
  // 50+ approved claims
};
const TIER_BONUSES = {
  bronze: 0,
  silver: 0.05,
  // +5%
  gold: 0.1
  // +10%
};
function calculateTier(approvedClaimsCount) {
  if (approvedClaimsCount >= TIER_THRESHOLDS.gold) return "gold";
  if (approvedClaimsCount >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}
async function getUser(clerkUserId) {
  return db.select().from(Users).where(eq(Users.id, clerkUserId)).get();
}
function formatCurrency(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}
const CASHBACK_CONFIG = {
  baseRate: 0.02,
  // 2% base cashback rate
  platformCut: 0.5
  // Platform keeps 50% of commission
};
function calculateCashback(priceInCents, tier) {
  const baseAmount = priceInCents * CASHBACK_CONFIG.baseRate * (1 - CASHBACK_CONFIG.platformCut);
  const tierBonus = TIER_BONUSES[tier];
  return Math.round(baseAmount * (1 + tierBonus));
}
async function createPurchaseClaim(userId, amazonOrderId, productSlug, productTitle, purchaseDate, claimedAmount) {
  const existing = await db.select().from(PurchaseClaims).where(eq(PurchaseClaims.amazonOrderId, amazonOrderId)).get();
  if (existing) {
    throw new Error("A claim for this order already exists");
  }
  await db.insert(PurchaseClaims).values({
    userId,
    amazonOrderId,
    productSlug,
    productTitle,
    purchaseDate,
    claimedAmount,
    status: "pending",
    createdAt: /* @__PURE__ */ new Date()
  });
  return db.select().from(PurchaseClaims).where(eq(PurchaseClaims.amazonOrderId, amazonOrderId)).get();
}
async function getClaimById(claimId) {
  return db.select().from(PurchaseClaims).where(eq(PurchaseClaims.id, claimId)).get();
}
async function approveClaim(claimId, approvedAmount, adminUserId, adminNotes) {
  const claim = await getClaimById(claimId);
  if (!claim) throw new Error("Claim not found");
  if (claim.status !== "pending") throw new Error("Claim is not pending");
  const user = await getUser(claim.userId);
  if (!user) throw new Error("User not found");
  const now = /* @__PURE__ */ new Date();
  const newBalance = user.balance + approvedAmount;
  const newTotalEarned = user.totalEarned + approvedAmount;
  const newApprovedCount = user.approvedClaimsCount + 1;
  const newTier = calculateTier(newApprovedCount);
  await db.update(PurchaseClaims).set({
    status: "approved",
    approvedAmount,
    adminNotes,
    reviewedAt: now,
    reviewedBy: adminUserId
  }).where(eq(PurchaseClaims.id, claimId));
  await db.update(Users).set({
    balance: newBalance,
    totalEarned: newTotalEarned,
    approvedClaimsCount: newApprovedCount,
    tier: newTier,
    updatedAt: now
  }).where(eq(Users.id, claim.userId));
  await db.insert(CashbackTransactions).values({
    userId: claim.userId,
    type: "credit",
    amount: approvedAmount,
    description: `Cashback for ${claim.productTitle}`,
    referenceType: "claim",
    referenceId: claimId,
    balanceAfter: newBalance,
    createdAt: now
  });
  return getClaimById(claimId);
}
async function rejectClaim(claimId, adminUserId, adminNotes) {
  const claim = await getClaimById(claimId);
  if (!claim) throw new Error("Claim not found");
  if (claim.status !== "pending") throw new Error("Claim is not pending");
  await db.update(PurchaseClaims).set({
    status: "rejected",
    adminNotes,
    reviewedAt: /* @__PURE__ */ new Date(),
    reviewedBy: adminUserId
  }).where(eq(PurchaseClaims.id, claimId));
  return getClaimById(claimId);
}
const PAYOUT_CONFIG = {
  minimumAmount: 1500
  // $15.00 minimum payout in cents
};
async function createPayoutRequest(userId, amount, method, paypalEmail, cryptoAddress) {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");
  if (user.balance < amount) throw new Error("Insufficient balance");
  if (amount < PAYOUT_CONFIG.minimumAmount) {
    throw new Error(`Minimum payout is ${formatCurrency(PAYOUT_CONFIG.minimumAmount)}`);
  }
  const pendingPayout = await db.select().from(PayoutRequests).where(and(
    eq(PayoutRequests.userId, userId),
    eq(PayoutRequests.status, "pending")
  )).get();
  if (pendingPayout) {
    throw new Error("You already have a pending payout request");
  }
  await db.insert(PayoutRequests).values({
    userId,
    amount,
    method,
    paypalEmail: method === "paypal" ? paypalEmail : null,
    cryptoAddress: method === "crypto" ? cryptoAddress : null,
    status: "pending",
    createdAt: /* @__PURE__ */ new Date()
  });
  const newBalance = user.balance - amount;
  await db.update(Users).set({
    balance: newBalance,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(Users.id, userId));
  await db.insert(CashbackTransactions).values({
    userId,
    type: "debit",
    amount: -amount,
    description: `Payout request via ${method}`,
    referenceType: "payout",
    balanceAfter: newBalance,
    createdAt: /* @__PURE__ */ new Date()
  });
  return db.select().from(PayoutRequests).where(eq(PayoutRequests.userId, userId)).orderBy(desc(PayoutRequests.createdAt)).get();
}
async function getPayoutById(payoutId) {
  return db.select().from(PayoutRequests).where(eq(PayoutRequests.id, payoutId)).get();
}
async function processPayoutRequest(payoutId, adminUserId) {
  const payout = await getPayoutById(payoutId);
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "pending") throw new Error("Payout is not pending");
  await db.update(PayoutRequests).set({
    status: "processing",
    processedBy: adminUserId
  }).where(eq(PayoutRequests.id, payoutId));
  return getPayoutById(payoutId);
}
async function completePayoutRequest(payoutId, adminUserId, transactionRef, adminNotes) {
  const payout = await getPayoutById(payoutId);
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "processing") throw new Error("Payout is not in processing state");
  await db.update(PayoutRequests).set({
    status: "completed",
    transactionRef,
    adminNotes,
    processedAt: /* @__PURE__ */ new Date(),
    processedBy: adminUserId
  }).where(eq(PayoutRequests.id, payoutId));
  return getPayoutById(payoutId);
}
async function failPayoutRequest(payoutId, adminUserId, adminNotes) {
  const payout = await getPayoutById(payoutId);
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "completed") throw new Error("Cannot fail a completed payout");
  const user = await getUser(payout.userId);
  if (!user) throw new Error("User not found");
  const now = /* @__PURE__ */ new Date();
  const newBalance = user.balance + payout.amount;
  await db.update(Users).set({
    balance: newBalance,
    updatedAt: now
  }).where(eq(Users.id, payout.userId));
  await db.insert(CashbackTransactions).values({
    userId: payout.userId,
    type: "credit",
    amount: payout.amount,
    description: `Payout refund - ${adminNotes}`,
    referenceType: "payout",
    referenceId: payoutId,
    balanceAfter: newBalance,
    createdAt: now
  });
  await db.update(PayoutRequests).set({
    status: "failed",
    adminNotes,
    processedAt: now,
    processedBy: adminUserId
  }).where(eq(PayoutRequests.id, payoutId));
  return getPayoutById(payoutId);
}
async function recordAffiliateClick(productSlug, userId, sessionId, ipHash, userAgent) {
  await db.insert(AffiliateClicks).values({
    userId: userId || null,
    productSlug,
    sessionId: sessionId || null,
    ipHash: ipHash || null,
    userAgent: userAgent || null,
    createdAt: /* @__PURE__ */ new Date()
  });
}
async function getAllProducts(options) {
  let query = db.select().from(Products);
  const conditions = [];
  if (options?.lang) {
    conditions.push(eq(Products.lang, options.lang));
  }
  if (options?.status) {
    conditions.push(eq(Products.status, options.status));
  }
  if (options?.category) {
    conditions.push(eq(Products.category, options.category));
  }
  if (options?.featured !== void 0) {
    conditions.push(eq(Products.isFeatured, options.featured));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  query = query.orderBy(desc(Products.isFeatured), desc(Products.createdAt));
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  return query.all();
}
async function getPublishedProducts(lang, limit) {
  return getAllProducts({
    lang,
    status: "published",
    limit
  });
}
async function getProductBySlug(productId, lang) {
  if (lang) {
    return db.select().from(Products).where(and(
      eq(Products.productId, productId),
      eq(Products.lang, lang)
    )).get();
  }
  return db.select().from(Products).where(eq(Products.productId, productId)).get();
}
async function getProductById(id) {
  return db.select().from(Products).where(eq(Products.id, id)).get();
}
async function createProduct(data) {
  const existing = await getProductBySlug(data.productId, data.lang);
  if (existing) {
    throw new Error(`Product with ID "${data.productId}" already exists for language "${data.lang}"`);
  }
  const now = /* @__PURE__ */ new Date();
  await db.insert(Products).values({
    productId: data.productId,
    asin: data.asin,
    lang: data.lang || "en",
    title: data.title,
    brand: data.brand,
    model: data.model,
    description: data.description,
    shortDescription: data.shortDescription,
    category: data.category,
    subcategory: data.subcategory,
    tags: data.tags || [],
    price: data.price,
    originalPrice: data.originalPrice,
    currency: data.currency || "USD",
    affiliateUrl: data.affiliateUrl,
    rating: data.rating,
    totalReviews: data.totalReviews,
    ourRating: data.ourRating,
    pros: data.pros || [],
    cons: data.cons || [],
    specifications: data.specifications,
    featuredImageUrl: data.featuredImageUrl,
    featuredImageAlt: data.featuredImageAlt || data.title,
    gallery: data.gallery,
    content: data.content,
    status: data.status || "draft",
    isFeatured: data.isFeatured || false,
    isOnSale: data.isOnSale || false,
    relatedProducts: data.relatedProducts,
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === "published" ? now : void 0
  });
  return getProductBySlug(data.productId, data.lang);
}
async function updateProduct(id, data) {
  const product = await getProductById(id);
  if (!product) {
    throw new Error("Product not found");
  }
  const now = /* @__PURE__ */ new Date();
  const updateData = {
    ...data,
    updatedAt: now
  };
  if (data.status === "published" && product.status !== "published") {
    updateData.publishedAt = now;
  }
  await db.update(Products).set(updateData).where(eq(Products.id, id));
  return getProductById(id);
}
async function deleteProduct(id) {
  const product = await getProductById(id);
  if (!product) {
    throw new Error("Product not found");
  }
  await db.delete(Products).where(eq(Products.id, id));
  return product;
}
async function getRelatedProducts(productIds, lang, limit = 4) {
  if (!productIds || productIds.length === 0) return [];
  const products = [];
  for (const productId of productIds.slice(0, limit)) {
    const product = await getProductBySlug(productId, lang);
    if (product && product.status === "published") {
      products.push(product);
    }
  }
  return products;
}
export {
  approveClaim as a,
  getProductById as b,
  completePayoutRequest as c,
  getProductBySlug as d,
  deleteProduct as e,
  failPayoutRequest as f,
  getAllProducts as g,
  createProduct as h,
  recordAffiliateClick as i,
  getUser as j,
  calculateCashback as k,
  createPurchaseClaim as l,
  createPayoutRequest as m,
  getRelatedProducts as n,
  getPublishedProducts as o,
  processPayoutRequest as p,
  rejectClaim as r,
  updateProduct as u
};
