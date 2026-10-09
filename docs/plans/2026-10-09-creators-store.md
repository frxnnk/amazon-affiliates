# Creators Store Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Populate public discovery, search and product lookup from Amazon Creators exclusively, with honest unavailable states and bounded usage.

**Architecture:** A server-only official client owns OAuth, normalization, expiring in-memory cache and request throttling. A storefront service maps its results to the existing UI contracts; thin public routes call this service. UI language is independent of the configured marketplace.

**Tech Stack:** Astro, TypeScript, Node 24, existing OpenShip Docker deployment. No new dependencies.

---

### Task 1: Official Creators client

Files: `src/lib/amazon-creators/*`, `tests/unit/creators-api.test.mjs`.
Implement LWA credentials with explicit version 3.1/3.2/3.3, GetItems and SearchItems, lowerCamelCase responses and nested money prices. Preserve official product URLs. Redact auth errors; limit request rate, budget, pending queue, cache size and cache lifetime. Test OAuth failure, actual documented response shape, coalescing, cache expiry and throttling with mocked fetch, never real credentials.

### Task 2: Public storefront service and routes

Files: `src/lib/storefront*`, `src/pages/api/feed/{products,product-by-link}.ts`, `src/pages/api/search/{index,products}.ts`, `tests/unit/storefront*.test.mjs`.
Implement category discovery with deterministic keyword recipes, supported Amazon search filters and bounded pagination. Amazon.com is the initial market and uses rewardhive-20; other markets require explicit tags. Nullable attributes stay unknown. Distinguish zero results from provider errors. No RapidAPI, Keepa, review enrichment, AI or database catalog write on a public visit.

### Task 3: User interface

Files: feed/search components, home page, site config, shared catalog display helper and tests.
Keep the layout while separating language from marketplace, handling missing price/image/rating, escaping inserted text and URLs, and showing a readable unavailable message. Replace the static Fuse catalog download with actual server search. Remove unsupported rewards/exclusive-deal promises.

### Task 4: Integration and release

Files: provider guards, runtime tests, deployment documentation.
Run `npm run test:unit`, `npm run db:schema:check`, Node production build and `npm run test:runtime`. Runtime tests use an isolated database and outbound-blocking or deterministic official-provider fixtures. Review the combined diff. Release through the existing master auto-deploy and verify fresh SSH, public route responses and browser UI.

### Authentication dependency

Existing web and bot credentials fail authentication. Inspect the signed-in Amazon account for active credential/version. Credential creation/entry is performed by the user; keep secrets out of chat and commits. Catalog activation requires a successful official request; do not mark a catalog populated based on mock tests.
