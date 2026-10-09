// Shared by the feed and both search views. Keep provider details on the server.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function safeCatalogUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function formatCatalogPrice(price, currency = '', lang = 'es') {
  const unavailable = lang === 'es' ? 'Ver en Amazon' : 'View on Amazon';
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return unavailable;
  try {
    return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency', currency,
    }).format(price);
  } catch { return unavailable; }
}

export function catalogUnavailableMessage(lang = 'es') {
  return lang === 'es'
    ? 'El catálogo no está disponible en este momento. Inténtalo de nuevo más tarde.'
    : 'The catalog is unavailable right now. Please try again later.';
}

export async function readCatalogResponse(response, lang = 'es') {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success || !Array.isArray(data.products)) {
    throw new Error(catalogUnavailableMessage(lang));
  }
  return data;
}
