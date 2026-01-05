# Amazon Product Advertising API (PA-API) Integration

## Overview

The Product Advertising API (PA-API) is Amazon's official API for Associates to programmatically access product information. This document outlines the requirements, capabilities, and implementation plan for integrating PA-API into the admin tools.

## Why PA-API?

Currently we have:
- **Simple tag appending** - Converts URLs to affiliate links (already implemented at `/admin/tools/affiliate-link`)

PA-API would enable:
- **Product data scraping** - Title, description, images, features
- **Real-time pricing** - Current price, deals, availability
- **Reviews/ratings** - Star ratings and review counts
- **Product search** - Find products by keyword without needing a URL

## Requirements

### 1. Amazon Associates Account
- Must be an approved Amazon Associate
- Account must be in good standing

### 2. API Access Requirements
- **Must make 3+ qualifying sales in 180 days** to maintain API access
- New accounts get temporary access, then must meet sales threshold
- Different quotas per marketplace (US, ES, UK, etc.)

### 3. Credentials Needed
- **Access Key** - From Amazon Associates
- **Secret Key** - From Amazon Associates
- **Partner Tag** - Your associate tag (e.g., `yourstore-20`)
- **Marketplace** - Region endpoint (e.g., `webservices.amazon.com` for US)

## API Capabilities

### GetItems
Get detailed product information by ASIN(s).

**Returns:**
- Title
- Brand
- Product description
- Bullet points/features
- Images (multiple sizes)
- Price (current, savings, currency)
- Availability
- Customer reviews summary
- Product dimensions/weight
- Categories

### SearchItems
Search for products by keyword.

**Returns:**
- List of matching products with above details
- Pagination support
- Sort options (relevance, price, reviews)

### GetVariations
Get product variations (colors, sizes, etc.) for a parent ASIN.

### GetBrowseNodes
Navigate Amazon's category tree.

## Rate Limits

| Scenario | Requests/Second |
|----------|-----------------|
| Default (new) | 1 |
| With sales | Up to 8.4 (based on revenue) |
| Burst | 10 requests at once |

**Throttling**: Returns HTTP 429 when exceeded. Implement exponential backoff.

## Implementation Plan

### Phase 1: Basic Integration

1. **Environment Setup**
   ```
   # Add to .env
   AMAZON_PA_API_ACCESS_KEY=xxx
   AMAZON_PA_API_SECRET_KEY=xxx
   AMAZON_PA_API_PARTNER_TAG_ES=tutienda-21
   AMAZON_PA_API_PARTNER_TAG_EN=bestdeal0ee40-20
   ```

2. **Create API Client** (`src/lib/amazon-pa-api.ts`)
   - AWS Signature Version 4 authentication
   - Request signing with HMAC-SHA256
   - Rate limiting with queue
   - Error handling and retries

3. **API Endpoints**
   - `POST /api/admin/pa-api/get-item` - Fetch single product by ASIN
   - `POST /api/admin/pa-api/search` - Search products by keyword

### Phase 2: Admin UI Integration

1. **Enhanced Import Page**
   - When URL is pasted, use PA-API to fetch full product data
   - Auto-fill title, brand, description, price, images
   - Show real-time availability

2. **Product Search Tool**
   - New admin page to search Amazon by keyword
   - Preview products before importing
   - Bulk import support

3. **Price Monitoring** (Future)
   - Periodic price checks for existing products
   - Alert when prices drop significantly
   - Auto-update product prices in catalog

### Phase 3: Advanced Features

1. **Variation Support**
   - Import all color/size variants of a product
   - Link related products

2. **Deal Detection**
   - Identify Lightning Deals, Prime Day deals
   - Auto-flag products on sale

## Code Example: Request Signing

PA-API uses AWS Signature Version 4. Here's the signing process:

```typescript
import { createHmac, createHash } from 'crypto';

interface PAAPIConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace: string; // e.g., 'www.amazon.com'
  region: string;      // e.g., 'us-east-1'
}

async function signRequest(
  config: PAAPIConfig,
  operation: string,
  payload: object
): Promise<{ headers: Record<string, string>; body: string }> {
  const host = `webservices.${config.marketplace}`;
  const path = '/paapi5/' + operation.toLowerCase();
  const service = 'ProductAdvertisingAPI';

  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = timestamp.slice(0, 8);

  const body = JSON.stringify(payload);
  const bodyHash = createHash('sha256').update(body).digest('hex');

  const headers = {
    'content-type': 'application/json; charset=UTF-8',
    'content-encoding': 'amz-1.0',
    'host': host,
    'x-amz-date': timestamp,
    'x-amz-target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`,
  };

  // Create canonical request
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}:${v}`)
    .join('\n');

  const signedHeaders = Object.keys(headers)
    .sort()
    .map(k => k.toLowerCase())
    .join(';');

  const canonicalRequest = [
    'POST',
    path,
    '',
    canonicalHeaders + '\n',
    signedHeaders,
    bodyHash
  ].join('\n');

  // Create string to sign
  const credentialScope = `${date}/${config.region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  // Calculate signature
  const kDate = createHmac('sha256', 'AWS4' + config.secretKey).update(date).digest();
  const kRegion = createHmac('sha256', kDate).update(config.region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  // Create authorization header
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(', ');

  return {
    headers: { ...headers, authorization },
    body
  };
}
```

## GetItems Request Example

```typescript
const payload = {
  PartnerTag: 'bestdeal0ee40-20',
  PartnerType: 'Associates',
  Marketplace: 'www.amazon.com',
  ItemIds: ['B0EXAMPLE1'],
  Resources: [
    'ItemInfo.Title',
    'ItemInfo.ByLineInfo',
    'ItemInfo.Features',
    'Images.Primary.Large',
    'Images.Variants.Large',
    'Offers.Listings.Price',
    'Offers.Listings.SavingBasis',
    'CustomerReviews.StarRating',
    'CustomerReviews.Count'
  ]
};

const response = await fetch(`https://webservices.amazon.com/paapi5/getitems`, {
  method: 'POST',
  headers: signedHeaders,
  body: JSON.stringify(payload)
});
```

## Response Example

```json
{
  "ItemsResult": {
    "Items": [{
      "ASIN": "B0EXAMPLE1",
      "ItemInfo": {
        "Title": { "DisplayValue": "Product Name" },
        "ByLineInfo": { "Brand": { "DisplayValue": "Brand Name" } },
        "Features": { "DisplayValues": ["Feature 1", "Feature 2"] }
      },
      "Images": {
        "Primary": { "Large": { "URL": "https://...", "Width": 500, "Height": 500 } }
      },
      "Offers": {
        "Listings": [{
          "Price": { "Amount": 29.99, "Currency": "USD", "DisplayAmount": "$29.99" },
          "SavingBasis": { "Amount": 49.99, "DisplayAmount": "$49.99" }
        }]
      }
    }]
  }
}
```

## Libraries to Consider

- **amazon-paapi** (npm) - Unofficial but popular Node.js client
- **Custom implementation** - More control, follows AWS signing exactly

## Error Codes

| Code | Meaning |
|------|---------|
| `InvalidParameterValue` | Invalid ASIN or parameter |
| `ItemsNotFound` | ASIN doesn't exist |
| `TooManyRequests` | Rate limit exceeded |
| `AccessDenied` | Invalid credentials or no API access |

## Marketplace Endpoints

| Region | Host | Endpoint Region |
|--------|------|-----------------|
| US | webservices.amazon.com | us-east-1 |
| Spain | webservices.amazon.es | eu-west-1 |
| UK | webservices.amazon.co.uk | eu-west-1 |
| Germany | webservices.amazon.de | eu-west-1 |

## Next Steps

1. [ ] Obtain PA-API credentials from Amazon Associates
2. [ ] Add environment variables to Vercel
3. [ ] Implement `src/lib/amazon-pa-api.ts` client
4. [ ] Create API route `/api/admin/pa-api/get-item`
5. [ ] Integrate with import page for auto-fill
6. [ ] Add product search tool to admin

## Resources

- [PA-API 5.0 Documentation](https://webservices.amazon.com/paapi5/documentation/)
- [Getting Started Guide](https://webservices.amazon.com/paapi5/documentation/quick-start/using-sdk.html)
- [API Reference](https://webservices.amazon.com/paapi5/documentation/api-reference.html)
- [Sample Code (Python, Java, PHP)](https://webservices.amazon.com/paapi5/documentation/quick-start/using-sdk.html)
