# Architecture Overview

## System Design

Amazon Referrals is a hybrid SSG/SSR application built with Astro. Static pages are pre-rendered at build time for performance, while dynamic features (user dashboard, admin) use server-side rendering.

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Static    │  │    SSR      │  │      API Routes         │  │
│  │   Pages     │  │   Pages     │  │  /api/admin/*           │  │
│  │  (products, │  │  (dashboard,│  │  /api/track-click       │  │
│  │   lists)    │  │   admin)    │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────┐    ┌─────────────┐      ┌─────────────┐
│   GitHub    │    │   Astro DB  │      │    Clerk    │
│  (Content)  │    │  (User Data)│      │   (Auth)    │
│  markdown   │    │   libSQL    │      │             │
└─────────────┘    └─────────────┘      └─────────────┘
```

## Layer Boundaries

### 1. Presentation Layer (`src/pages/`, `src/components/`)
- Astro pages and components
- No business logic here, only UI rendering
- Calls lib/ for data operations

### 2. Business Logic Layer (`src/lib/`)
- Cashback calculations
- Reward tier logic
- Validation rules
- Pure functions, testable in isolation

### 3. Data Access Layer (`src/db/`, `src/utils/github.ts`)
- Astro DB queries for user data
- GitHub API for content operations
- Abstracted behind simple functions

### 4. Content Layer (`src/content/`)
- Astro content collections
- Markdown files with frontmatter
- Type-safe via content.config.ts

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| GitHub as CMS | Free, version controlled, no DB costs for content |
| Astro DB for user data | Native to Astro, simple, free tier |
| Hybrid rendering | Static for SEO, SSR for personalized pages |
| Clerk for auth | Battle-tested, handles edge cases |

## Data Flow Examples

### User Views Product
```
1. Static page served from CDN (pre-built)
2. Affiliate link includes tracking params
3. Click tracked via /api/track-click (if logged in)
```

### User Claims Purchase
```
1. User submits claim form (SSR page)
2. API route validates + saves to Astro DB
3. Admin reviews in admin panel
4. Approval triggers balance update
```

### Admin Creates Product
```
1. Admin fills form in admin panel
2. API route commits markdown to GitHub
3. Vercel webhook triggers rebuild
4. New product page is generated
```
