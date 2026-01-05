# Amazon Referrals

## WHAT - Codebase Map

**One-liner:** Curated Amazon product catalog with user cashback rewards.

**Tech Stack:**
- **Framework:** Astro 5.x (SSG/SSR hybrid)
- **Styling:** Tailwind CSS 4
- **Auth:** Clerk
- **Database:** Astro DB (libSQL/Turso)
- **CMS:** GitHub as headless CMS (markdown content via Octokit)
- **Search:** Fuse.js
- **Deployment:** Vercel
- **Testing:** Playwright (E2E)

**Repo Structure:**
```
src/
├── components/     # UI components (admin/, affiliate/, products/, ui/)
├── content/        # Markdown content collections (products, lists, deals, reviews)
├── data/           # Static JSON (categories, site-config)
├── db/             # Astro DB schema and queries
├── i18n/           # Translations (en, es)
├── layouts/        # Page layouts (Base, Product, Legal)
├── lib/            # Business logic (cashback, rewards)
├── pages/          # Routes (public, admin, API)
├── styles/         # Global CSS
└── utils/          # Helpers (affiliate, amazon, github, markdown)
```

---

## WHY - Domain & Purpose

**Users:**
- **Visitors:** Browse curated Amazon products, click affiliate links to buy
- **Registered Users:** Earn cashback on purchases, request payouts
- **Admins:** Manage products, lists, verify purchases, process payouts

**Core Flows:**
- Browse products/lists → Click affiliate link → Buy on Amazon
- User claims purchase → Admin verifies → Cashback credited
- User requests payout ($15 min) → Admin processes (PayPal/Crypto)

**Domain Rules:**
- Amazon US region only (for now)
- Cashback = fixed % of Amazon commission, with loyalty tier bonuses
- Purchase verification is manual (user submits order ID)
- All product content stored as markdown in GitHub

---

## HOW - Working Rules

**Run the project:**
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

**Run tests:**
```bash
npx playwright test              # Run all E2E tests
npx playwright test --ui         # Interactive test UI
```

**Working principles:**
1. Prefer small, reversible changes
2. Respect existing patterns unless there's a clear bug
3. Ask for clarification on ambiguous requirements
4. For larger tasks: plan first, then implement
5. Update features.json and progress.md after completing features
6. Commit after each completed feature with clear messages

**Commit format:**
- `feat: <feature-id> - <description>`
- `fix: <feature-id> - <description>`
- `chore: <description>`

---

## Further Docs

Only read these when the current task needs them (progressive disclosure):

- `/docs/architecture/overview.md` - System design, component boundaries
- `/docs/domain/domain_overview.md` - Entities, cashback logic, user journeys
- `/docs/conventions/code_conventions.md` - Error handling, patterns
- `/docs/testing/testing.md` - Test organization, commands

**Tracking files:**
- `features.json` - Machine-readable feature list with status
- `progress.md` - Human-readable progress log
