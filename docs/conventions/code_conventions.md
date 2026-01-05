# Code Conventions

## Error Handling

### API Routes
Return consistent error responses:

```typescript
// Success
return new Response(JSON.stringify({ data }), { status: 200 });

// Client error
return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });

// Server error
return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
```

### UI Components
- Show user-friendly error messages
- Log technical details to console in dev only
- Use error boundaries for critical sections

## Component Structure

### Astro Components
```astro
---
// 1. Imports
import { getEntry } from 'astro:content';

// 2. Props interface
interface Props {
  slug: string;
}

// 3. Data fetching
const { slug } = Astro.props;
const product = await getEntry('products', slug);

// 4. Early returns for error states
if (!product) {
  return Astro.redirect('/404');
}
---

<!-- 5. Template -->
<article>
  <h1>{product.data.title}</h1>
</article>

<style>
  /* 6. Scoped styles (prefer Tailwind) */
</style>
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `product-card.astro` |
| Components | PascalCase | `ProductCard` |
| Functions | camelCase | `calculateCashback` |
| Constants | UPPER_SNAKE | `MAX_PAYOUT_AMOUNT` |
| DB tables | snake_case | `purchase_claims` |

## TypeScript

- Prefer interfaces over types for object shapes
- Use `unknown` over `any` when type is truly unknown
- Export types from a central location when shared

## Tailwind CSS

- Use Tailwind utilities directly in templates
- Extract to `@apply` only for highly repeated patterns
- Keep global styles minimal (`src/styles/global.css`)

## Content Collections

- Each content type has its own folder under `src/content/`
- Frontmatter schema defined in `src/content.config.ts`
- Use `[lang]` folders for i18n content organization
