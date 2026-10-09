import { escapeHtml } from './catalog-ui.mjs';
// Required notices: Associates Agreement §5 and Program IP License §2(i), §2(k).
// https://affiliate-program.amazon.com/help/operating/policies
const text = {
  en: {
    affiliate: 'As an Amazon Associate I earn from qualifying purchases.',
    content: "Certain content that appears on this site comes from Amazon. This content is provided ‘AS IS’ and is subject to change or removal at any time.",
    price: 'Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on Amazon.com at the time of purchase will apply to the purchase of this product.',
    details: 'Price & availability', checked: 'Amazon data as of', unavailable: 'Check current details on Amazon',
  },
  es: {
    affiliate: 'Como Afiliado de Amazon, obtengo ingresos por las compras que cumplen los requisitos aplicables.',
    content: 'Parte del contenido de este sitio proviene de Amazon. Se proporciona tal cual y puede cambiar o eliminarse en cualquier momento.',
    price: 'Los precios y la disponibilidad corresponden a la fecha y hora indicadas y pueden cambiar. El precio y la disponibilidad que muestre Amazon.com en el momento de la compra serán los aplicables a ese producto.',
    details: 'Precio y disponibilidad', checked: 'Datos de Amazon consultados', unavailable: 'Consulta los datos vigentes en Amazon',
  },
};
export function amazonNotices(lang = 'en') { return text[lang === 'es' ? 'es' : 'en']; }
export function priceDetailsHtml(lang, fetchedAt) {
  const copy = amazonNotices(lang);
  const time = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
  const stamp = Number.isFinite(time) ? new Date(time).toISOString() : null;
  const date = stamp ? `${stamp.slice(0, 10)} ${stamp.slice(11, 16)} UTC` : '';
  return `<details class="amazon-price-details"><summary>${escapeHtml(copy.details)}</summary><p>${escapeHtml(copy.price)}</p></details>`
    + (stamp ? `<small class="amazon-price-time">${escapeHtml(copy.checked)} <time datetime="${stamp}">${date}</time></small>` : '');
}
