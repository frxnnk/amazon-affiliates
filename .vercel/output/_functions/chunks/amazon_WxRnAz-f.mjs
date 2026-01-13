function parseAmazonUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    if (!hostname.includes("amazon.")) {
      return null;
    }
    let marketplace = "es";
    if (hostname.includes("amazon.com") && !hostname.includes("amazon.com.")) {
      marketplace = "com";
    } else if (hostname.includes("amazon.co.uk")) {
      marketplace = "co.uk";
    } else if (hostname.includes("amazon.de")) {
      marketplace = "de";
    } else if (hostname.includes("amazon.fr")) {
      marketplace = "fr";
    } else if (hostname.includes("amazon.it")) {
      marketplace = "it";
    } else if (hostname.includes("amazon.es")) {
      marketplace = "es";
    }
    let asin = null;
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
    if (dpMatch) {
      asin = dpMatch[1].toUpperCase();
    }
    if (!asin) {
      const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      if (gpMatch) {
        asin = gpMatch[1].toUpperCase();
      }
    }
    if (!asin) {
      const mobileMatch = url.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i);
      if (mobileMatch) {
        asin = mobileMatch[1].toUpperCase();
      }
    }
    if (!asin) {
      const pathMatch = url.match(/\/([A-Z0-9]{10})(?:\/|\?|$)/i);
      if (pathMatch) {
        asin = pathMatch[1].toUpperCase();
      }
    }
    if (!asin) {
      return null;
    }
    const tagParam = urlObj.searchParams.get("tag");
    return {
      asin,
      marketplace,
      domain: hostname,
      productUrl: `https://www.amazon.${marketplace}/dp/${asin}`,
      affiliateTag: tagParam || void 0
    };
  } catch {
    return null;
  }
}
function generateAffiliateUrl(asin, marketplace = "es", tag) {
  const baseUrl = `https://www.amazon.${marketplace}/dp/${asin}`;
  if (tag) {
    return `${baseUrl}?tag=${tag}`;
  }
  return baseUrl;
}
function isValidAsin(asin) {
  return /^[A-Z0-9]{10}$/i.test(asin);
}
function extractTitleFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    const dpIndex = pathParts.findIndex((p) => p.toLowerCase() === "dp");
    if (dpIndex > 0) {
      const slug = pathParts[dpIndex - 1];
      return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }
    return null;
  } catch {
    return null;
  }
}
function getProductPrefillFromUrl(url, affiliateTag) {
  const urlData = parseAmazonUrl(url);
  if (!urlData) {
    return null;
  }
  const lang = urlData.marketplace === "com" ? "en" : "es";
  const finalTag = affiliateTag || urlData.affiliateTag;
  let affiliateUrl;
  if (urlData.affiliateTag && isSiteStripeUrl(url)) {
    affiliateUrl = buildCleanAffiliateUrl(urlData.asin, urlData.marketplace, urlData.affiliateTag);
  } else {
    affiliateUrl = generateAffiliateUrl(urlData.asin, urlData.marketplace, finalTag);
  }
  return {
    asin: urlData.asin,
    marketplace: urlData.marketplace,
    affiliateUrl,
    suggestedTitle: extractTitleFromUrl(url),
    lang
  };
}
function isSiteStripeUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has("linkCode") || urlObj.searchParams.has("linkId");
  } catch {
    return false;
  }
}
function buildCleanAffiliateUrl(asin, marketplace, tag) {
  return `https://www.amazon.${marketplace}/dp/${asin}?tag=${tag}`;
}
export {
  getProductPrefillFromUrl as g,
  isValidAsin as i,
  parseAmazonUrl as p
};
