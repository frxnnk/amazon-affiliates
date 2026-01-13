/**
 * Utilidades para trabajar con URLs y datos de Amazon
 */

export interface AmazonUrlData {
  asin: string;
  marketplace: 'es' | 'com' | 'co.uk' | 'de' | 'fr' | 'it';
  domain: string;
  productUrl: string;
  affiliateTag?: string;
}

/**
 * Extrae el ASIN y otros datos de una URL de Amazon
 */
export function parseAmazonUrl(url: string): AmazonUrlData | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Verificar que es un dominio de Amazon
    if (!hostname.includes('amazon.')) {
      return null;
    }

    // Determinar el marketplace
    let marketplace: AmazonUrlData['marketplace'] = 'es';
    if (hostname.includes('amazon.com') && !hostname.includes('amazon.com.')) {
      marketplace = 'com';
    } else if (hostname.includes('amazon.co.uk')) {
      marketplace = 'co.uk';
    } else if (hostname.includes('amazon.de')) {
      marketplace = 'de';
    } else if (hostname.includes('amazon.fr')) {
      marketplace = 'fr';
    } else if (hostname.includes('amazon.it')) {
      marketplace = 'it';
    } else if (hostname.includes('amazon.es')) {
      marketplace = 'es';
    }

    // Extraer ASIN - varios patrones posibles
    let asin: string | null = null;

    // Patrón 1: /dp/ASIN
    const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
    if (dpMatch) {
      asin = dpMatch[1].toUpperCase();
    }

    // Patrón 2: /gp/product/ASIN
    if (!asin) {
      const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      if (gpMatch) {
        asin = gpMatch[1].toUpperCase();
      }
    }

    // Patrón 3: /gp/aw/d/ASIN (mobile)
    if (!asin) {
      const mobileMatch = url.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i);
      if (mobileMatch) {
        asin = mobileMatch[1].toUpperCase();
      }
    }

    // Patrón 4: /ASIN/ en la URL
    if (!asin) {
      const pathMatch = url.match(/\/([A-Z0-9]{10})(?:\/|\?|$)/i);
      if (pathMatch) {
        asin = pathMatch[1].toUpperCase();
      }
    }

    if (!asin) {
      return null;
    }

    // Extraer tag de afiliado si existe
    const tagParam = urlObj.searchParams.get('tag');

    return {
      asin,
      marketplace,
      domain: hostname,
      productUrl: `https://www.amazon.${marketplace}/dp/${asin}`,
      affiliateTag: tagParam || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Genera URL de afiliado con tag
 */
export function generateAffiliateUrl(asin: string, marketplace: string = 'es', tag?: string): string {
  const baseUrl = `https://www.amazon.${marketplace}/dp/${asin}`;
  if (tag) {
    return `${baseUrl}?tag=${tag}`;
  }
  return baseUrl;
}

/**
 * Valida si un string es un ASIN válido
 */
export function isValidAsin(asin: string): boolean {
  return /^[A-Z0-9]{10}$/i.test(asin);
}

/**
 * Extrae título potencial de la URL de Amazon (del slug)
 */
export function extractTitleFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Buscar el slug antes de /dp/
    const dpIndex = pathParts.findIndex(p => p.toLowerCase() === 'dp');
    if (dpIndex > 0) {
      const slug = pathParts[dpIndex - 1];
      // Convertir slug a título legible
      return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Datos para pre-rellenar formulario desde URL
 */
export interface ProductPrefillData {
  asin: string;
  marketplace: string;
  affiliateUrl: string;
  suggestedTitle: string | null;
  lang: 'es' | 'en';
}

/**
 * Obtiene datos para pre-rellenar el formulario de producto
 * Si la URL ya contiene un tag de afiliado (como SiteStripe), lo preserva
 */
export function getProductPrefillFromUrl(url: string, affiliateTag?: string): ProductPrefillData | null {
  const urlData = parseAmazonUrl(url);
  if (!urlData) {
    return null;
  }

  const lang = urlData.marketplace === 'com' ? 'en' : 'es';

  // Priorizar: tag pasado explícitamente > tag en la URL > ninguno
  const finalTag = affiliateTag || urlData.affiliateTag;

  // Si es una URL de SiteStripe (tiene linkCode, linkId), preservar la URL completa
  // ya que contiene tracking adicional
  let affiliateUrl: string;
  if (urlData.affiliateTag && isSiteStripeUrl(url)) {
    // Limpiar la URL de SiteStripe manteniendo solo los parámetros esenciales
    affiliateUrl = buildCleanAffiliateUrl(urlData.asin, urlData.marketplace, urlData.affiliateTag);
  } else {
    affiliateUrl = generateAffiliateUrl(urlData.asin, urlData.marketplace, finalTag);
  }

  return {
    asin: urlData.asin,
    marketplace: urlData.marketplace,
    affiliateUrl,
    suggestedTitle: extractTitleFromUrl(url),
    lang,
  };
}

/**
 * Detecta si una URL es generada por SiteStripe
 */
function isSiteStripeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has('linkCode') || urlObj.searchParams.has('linkId');
  } catch {
    return false;
  }
}

/**
 * Construye una URL de afiliado limpia con el tag
 */
function buildCleanAffiliateUrl(asin: string, marketplace: string, tag: string): string {
  return `https://www.amazon.${marketplace}/dp/${asin}?tag=${tag}`;
}
