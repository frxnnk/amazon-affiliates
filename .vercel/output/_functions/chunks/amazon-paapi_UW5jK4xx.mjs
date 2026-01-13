import { createHash, createHmac } from "crypto";
const PA_API_SERVICE = "ProductAdvertisingAPI";
const PA_API_REGION = "us-east-1";
const PA_API_TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1";
const PAAPI_HOSTS = {
  "com": "webservices.amazon.com",
  "es": "webservices.amazon.es",
  "co.uk": "webservices.amazon.co.uk",
  "de": "webservices.amazon.de",
  "fr": "webservices.amazon.fr",
  "it": "webservices.amazon.it"
};
const PAAPI_REGIONS = {
  "com": "us-east-1",
  "es": "eu-west-1",
  "co.uk": "eu-west-1",
  "de": "eu-west-1",
  "fr": "eu-west-1",
  "it": "eu-west-1"
};
function getPAAPIConfig() {
  {
    return null;
  }
}
function isPaapiConfigured() {
  return getPAAPIConfig() !== null;
}
function sha256(data) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}
function hmacSha256(key, data) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}
function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}
function createSignedHeaders(config, host, region, target, payload) {
  const now = /* @__PURE__ */ new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const method = "POST";
  const path = "/paapi5/getitems";
  const service = PA_API_SERVICE;
  const headers = {
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    "host": host,
    "x-amz-date": amzDate,
    "x-amz-target": target
  };
  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys.map((key) => `${key}:${headers[key]}`).join("\n") + "\n";
  const signedHeaders = sortedHeaderKeys.join(";");
  const payloadHash = sha256(payload);
  const canonicalRequest = [
    method,
    path,
    "",
    // query string (empty)
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");
  const signingKey = getSignatureKey(config.secretKey, dateStamp, region, service);
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");
  const authorization = `${algorithm} Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    ...headers,
    "Authorization": authorization
  };
}
function buildGetItemsPayload(asin, partnerTag, marketplace) {
  const payload = {
    ItemIds: [asin],
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: `www.amazon.${marketplace}`,
    Resources: [
      "Images.Primary.Large",
      "Images.Variants.Large",
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.Features",
      "ItemInfo.ProductInfo",
      "ItemInfo.TechnicalInfo",
      "Offers.Listings.Price",
      "Offers.Listings.SavingBasis",
      "Offers.Listings.Availability.Message",
      "CustomerReviews.StarRating",
      "CustomerReviews.Count"
    ]
  };
  return JSON.stringify(payload);
}
function parseProductResponse(item, marketplace) {
  const itemInfo = item.ItemInfo || {};
  const offers = item.Offers?.Listings?.[0] || {};
  const images = item.Images || {};
  const reviews = item.CustomerReviews || {};
  let price = null;
  let originalPrice = null;
  let currency = "USD";
  if (offers.Price?.Amount) {
    price = offers.Price.Amount;
    currency = offers.Price.Currency || "USD";
  }
  if (offers.SavingBasis?.Amount) {
    originalPrice = offers.SavingBasis.Amount;
  }
  const imageUrl = images.Primary?.Large?.URL || null;
  const variantImages = [];
  if (images.Variants) {
    for (const variant of images.Variants) {
      if (variant.Large?.URL) {
        variantImages.push(variant.Large.URL);
      }
    }
  }
  const features = itemInfo.Features?.DisplayValues || [];
  return {
    asin: item.ASIN,
    title: itemInfo.Title?.DisplayValue || "",
    brand: itemInfo.ByLineInfo?.Brand?.DisplayValue || null,
    price,
    originalPrice,
    currency,
    rating: reviews.StarRating?.Value || null,
    totalReviews: reviews.Count || null,
    imageUrl,
    images: [imageUrl, ...variantImages].filter(Boolean),
    features,
    description: features.length > 0 ? features.join(" ") : null,
    url: `https://www.amazon.${marketplace}/dp/${item.ASIN}`,
    availability: offers.Availability?.Message || null
  };
}
async function getProductByAsin(asin, marketplaceOrConfig) {
  let apiConfig;
  if (typeof marketplaceOrConfig === "string") {
    apiConfig = getPAAPIConfig();
    if (apiConfig) {
      apiConfig = { ...apiConfig, marketplace: marketplaceOrConfig };
    }
  } else {
    apiConfig = marketplaceOrConfig || getPAAPIConfig();
  }
  if (!apiConfig) {
    return {
      success: false,
      error: {
        code: "MISSING_CONFIG",
        message: "PA-API credentials not configured. Set AMAZON_PA_API_ACCESS_KEY, AMAZON_PA_API_SECRET_KEY, and AMAZON_PA_API_PARTNER_TAG environment variables."
      }
    };
  }
  if (!/^[A-Z0-9]{10}$/i.test(asin)) {
    return {
      success: false,
      error: {
        code: "INVALID_ASIN",
        message: `Invalid ASIN format: ${asin}. ASIN must be 10 alphanumeric characters.`
      }
    };
  }
  const marketplace = apiConfig.marketplace || "com";
  const host = PAAPI_HOSTS[marketplace] || PAAPI_HOSTS["com"];
  const region = PAAPI_REGIONS[marketplace] || PA_API_REGION;
  const target = `${PA_API_TARGET}.GetItems`;
  const payload = buildGetItemsPayload(asin.toUpperCase(), apiConfig.partnerTag, marketplace);
  const headers = createSignedHeaders(apiConfig, host, region, target, payload);
  try {
    const response = await fetch(`https://${host}/paapi5/getitems`, {
      method: "POST",
      headers,
      body: payload
    });
    const data = await response.json();
    if (!response.ok) {
      const errorCode = data.Errors?.[0]?.Code || "API_ERROR";
      const errorMessage = data.Errors?.[0]?.Message || `PA-API returned status ${response.status}`;
      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      };
    }
    if (!data.ItemsResult?.Items?.length) {
      if (data.Errors?.length) {
        return {
          success: false,
          error: {
            code: data.Errors[0].Code,
            message: data.Errors[0].Message
          }
        };
      }
      return {
        success: false,
        error: {
          code: "ITEM_NOT_FOUND",
          message: `Product with ASIN ${asin} not found on Amazon ${marketplace}.`
        }
      };
    }
    const item = data.ItemsResult.Items[0];
    const productData = parseProductResponse(item, marketplace);
    return {
      success: true,
      data: productData
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: `Failed to connect to Amazon PA-API: ${message}`
      }
    };
  }
}
export {
  getProductByAsin as g,
  isPaapiConfigured as i
};
