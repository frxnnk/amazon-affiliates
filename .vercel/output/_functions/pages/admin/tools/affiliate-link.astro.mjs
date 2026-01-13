import { c as createComponent, a as renderComponent, b as renderTemplate, g as defineScriptVars, m as maybeRenderHead } from "../../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$AdminLayout } from "../../../chunks/AdminLayout_CsZJh8mb.mjs";
import { s as siteConfig } from "../../../chunks/site-config_BzdwJVhh.mjs";
/* empty css                                                */
import { renderers } from "../../../renderers.mjs";
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const prerender = false;
const $$AffiliateLink = createComponent(async ($$result, $$props, $$slots) => {
  const affiliateTags = siteConfig.amazon.associates;
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "Generador de Enlaces de Afiliado", "data-astro-cid-yr62jefz": true }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template(["  ", '<div class="tool-container" data-astro-cid-yr62jefz> <div class="tool-card" data-astro-cid-yr62jefz> <div class="tool-header" data-astro-cid-yr62jefz> <h2 data-astro-cid-yr62jefz>Convertir URL de Amazon</h2> <p data-astro-cid-yr62jefz>Pega cualquier enlace de Amazon y obten tu enlace de afiliado con el tag configurado</p> </div> <div class="input-section" data-astro-cid-yr62jefz> <input type="text" id="amazonUrl" class="url-input" placeholder="https://www.amazon.es/dp/B0XXXXXXXXX o pega el link completo..." autofocus data-astro-cid-yr62jefz> <button type="button" id="convertBtn" class="convert-btn" data-astro-cid-yr62jefz>\nConvertir\n</button> </div> <div id="errorMessage" class="error-message" data-astro-cid-yr62jefz></div> <div id="results" class="results" data-astro-cid-yr62jefz> <div class="meta-info" data-astro-cid-yr62jefz> <div class="meta-item" data-astro-cid-yr62jefz> <span class="label" data-astro-cid-yr62jefz>ASIN</span> <span class="value" id="metaAsin" data-astro-cid-yr62jefz>-</span> </div> <div class="meta-item" data-astro-cid-yr62jefz> <span class="label" data-astro-cid-yr62jefz>Marketplace</span> <span class="value" id="metaMarketplace" data-astro-cid-yr62jefz>-</span> </div> </div> <div class="result-item" id="resultEs" data-astro-cid-yr62jefz> <div class="result-header" data-astro-cid-yr62jefz> <span class="result-label" data-astro-cid-yr62jefz>Enlace Afiliado ES</span> <span class="result-tag" id="tagEs" data-astro-cid-yr62jefz></span> </div> <div class="result-url-container" data-astro-cid-yr62jefz> <div class="result-url" id="urlEs" data-astro-cid-yr62jefz></div> <button type="button" class="copy-btn" data-target="urlEs" data-astro-cid-yr62jefz> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-yr62jefz> <rect x="9" y="9" width="13" height="13" rx="2" ry="2" data-astro-cid-yr62jefz></rect> <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" data-astro-cid-yr62jefz></path> </svg>\nCopiar\n</button> </div> </div> <div class="result-item" id="resultEn" data-astro-cid-yr62jefz> <div class="result-header" data-astro-cid-yr62jefz> <span class="result-label" data-astro-cid-yr62jefz>Enlace Afiliado EN (US)</span> <span class="result-tag" id="tagEn" data-astro-cid-yr62jefz></span> </div> <div class="result-url-container" data-astro-cid-yr62jefz> <div class="result-url" id="urlEn" data-astro-cid-yr62jefz></div> <button type="button" class="copy-btn" data-target="urlEn" data-astro-cid-yr62jefz> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-yr62jefz> <rect x="9" y="9" width="13" height="13" rx="2" ry="2" data-astro-cid-yr62jefz></rect> <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" data-astro-cid-yr62jefz></path> </svg>\nCopiar\n</button> </div> </div> </div> <div class="tags-reference" data-astro-cid-yr62jefz> <h3 data-astro-cid-yr62jefz>Tags Configurados</h3> <div class="tags-list" data-astro-cid-yr62jefz> <div class="tag-item" data-astro-cid-yr62jefz> <span class="flag" data-astro-cid-yr62jefz>🇪🇸</span> <code id="configTagEs" data-astro-cid-yr62jefz></code> </div> <div class="tag-item" data-astro-cid-yr62jefz> <span class="flag" data-astro-cid-yr62jefz>🇺🇸</span> <code id="configTagEn" data-astro-cid-yr62jefz></code> </div> </div> </div> </div> </div> <script>(function(){', `
    const amazonUrlInput = document.getElementById('amazonUrl');
    const convertBtn = document.getElementById('convertBtn');
    const errorMessage = document.getElementById('errorMessage');
    const results = document.getElementById('results');

    // Display configured tags
    document.getElementById('configTagEs').textContent = affiliateTags.es.tag;
    document.getElementById('configTagEn').textContent = affiliateTags.en.tag;
    document.getElementById('tagEs').textContent = affiliateTags.es.tag;
    document.getElementById('tagEn').textContent = affiliateTags.en.tag;

    function parseAmazonUrl(url) {
      try {
        // Handle ASIN directly
        if (/^[A-Z0-9]{10}$/i.test(url.trim())) {
          return { asin: url.trim().toUpperCase(), marketplace: 'es' };
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        if (!hostname.includes('amazon.')) {
          return null;
        }

        // Determine marketplace
        let marketplace = 'es';
        if (hostname.includes('amazon.com') && !hostname.includes('amazon.com.')) {
          marketplace = 'com';
        } else if (hostname.includes('amazon.es')) {
          marketplace = 'es';
        } else if (hostname.includes('amazon.co.uk')) {
          marketplace = 'co.uk';
        } else if (hostname.includes('amazon.de')) {
          marketplace = 'de';
        }

        // Extract ASIN
        let asin = null;
        const patterns = [
          /\\/dp\\/([A-Z0-9]{10})/i,
          /\\/gp\\/product\\/([A-Z0-9]{10})/i,
          /\\/gp\\/aw\\/d\\/([A-Z0-9]{10})/i,
          /\\/([A-Z0-9]{10})(?:\\/|\\?|$)/i
        ];

        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            asin = match[1].toUpperCase();
            break;
          }
        }

        if (!asin) return null;

        return { asin, marketplace };
      } catch {
        return null;
      }
    }

    function generateAffiliateUrl(asin, marketplace, tag) {
      return \`https://www.amazon.\${marketplace}/dp/\${asin}?tag=\${tag}&linkCode=ogi&th=1&psc=1\`;
    }

    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.classList.add('visible');
      results.classList.remove('visible');
    }

    function hideError() {
      errorMessage.classList.remove('visible');
    }

    function convert() {
      const input = amazonUrlInput.value.trim();
      if (!input) {
        showError('Por favor ingresa una URL de Amazon o un ASIN');
        return;
      }

      hideError();

      const parsed = parseAmazonUrl(input);
      if (!parsed) {
        showError('No se pudo extraer el ASIN. Verifica que sea una URL de Amazon valida.');
        return;
      }

      const { asin, marketplace } = parsed;

      // Update meta
      document.getElementById('metaAsin').textContent = asin;
      document.getElementById('metaMarketplace').textContent = \`amazon.\${marketplace}\`;

      // Generate affiliate URLs
      const urlEs = generateAffiliateUrl(asin, 'es', affiliateTags.es.tag);
      const urlEn = generateAffiliateUrl(asin, 'com', affiliateTags.en.tag);

      document.getElementById('urlEs').textContent = urlEs;
      document.getElementById('urlEn').textContent = urlEn;

      results.classList.add('visible');
    }

    // Copy functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-target');
        const urlElement = document.getElementById(targetId);
        const url = urlElement.textContent;

        try {
          await navigator.clipboard.writeText(url);
          btn.classList.add('copied');
          btn.innerHTML = \`
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Copiado!
          \`;

          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = \`
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copiar
            \`;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });

    // Event listeners
    convertBtn.addEventListener('click', convert);
    amazonUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        convert();
      }
    });
  })();<\/script> `], ["  ", '<div class="tool-container" data-astro-cid-yr62jefz> <div class="tool-card" data-astro-cid-yr62jefz> <div class="tool-header" data-astro-cid-yr62jefz> <h2 data-astro-cid-yr62jefz>Convertir URL de Amazon</h2> <p data-astro-cid-yr62jefz>Pega cualquier enlace de Amazon y obten tu enlace de afiliado con el tag configurado</p> </div> <div class="input-section" data-astro-cid-yr62jefz> <input type="text" id="amazonUrl" class="url-input" placeholder="https://www.amazon.es/dp/B0XXXXXXXXX o pega el link completo..." autofocus data-astro-cid-yr62jefz> <button type="button" id="convertBtn" class="convert-btn" data-astro-cid-yr62jefz>\nConvertir\n</button> </div> <div id="errorMessage" class="error-message" data-astro-cid-yr62jefz></div> <div id="results" class="results" data-astro-cid-yr62jefz> <div class="meta-info" data-astro-cid-yr62jefz> <div class="meta-item" data-astro-cid-yr62jefz> <span class="label" data-astro-cid-yr62jefz>ASIN</span> <span class="value" id="metaAsin" data-astro-cid-yr62jefz>-</span> </div> <div class="meta-item" data-astro-cid-yr62jefz> <span class="label" data-astro-cid-yr62jefz>Marketplace</span> <span class="value" id="metaMarketplace" data-astro-cid-yr62jefz>-</span> </div> </div> <div class="result-item" id="resultEs" data-astro-cid-yr62jefz> <div class="result-header" data-astro-cid-yr62jefz> <span class="result-label" data-astro-cid-yr62jefz>Enlace Afiliado ES</span> <span class="result-tag" id="tagEs" data-astro-cid-yr62jefz></span> </div> <div class="result-url-container" data-astro-cid-yr62jefz> <div class="result-url" id="urlEs" data-astro-cid-yr62jefz></div> <button type="button" class="copy-btn" data-target="urlEs" data-astro-cid-yr62jefz> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-yr62jefz> <rect x="9" y="9" width="13" height="13" rx="2" ry="2" data-astro-cid-yr62jefz></rect> <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" data-astro-cid-yr62jefz></path> </svg>\nCopiar\n</button> </div> </div> <div class="result-item" id="resultEn" data-astro-cid-yr62jefz> <div class="result-header" data-astro-cid-yr62jefz> <span class="result-label" data-astro-cid-yr62jefz>Enlace Afiliado EN (US)</span> <span class="result-tag" id="tagEn" data-astro-cid-yr62jefz></span> </div> <div class="result-url-container" data-astro-cid-yr62jefz> <div class="result-url" id="urlEn" data-astro-cid-yr62jefz></div> <button type="button" class="copy-btn" data-target="urlEn" data-astro-cid-yr62jefz> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-yr62jefz> <rect x="9" y="9" width="13" height="13" rx="2" ry="2" data-astro-cid-yr62jefz></rect> <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" data-astro-cid-yr62jefz></path> </svg>\nCopiar\n</button> </div> </div> </div> <div class="tags-reference" data-astro-cid-yr62jefz> <h3 data-astro-cid-yr62jefz>Tags Configurados</h3> <div class="tags-list" data-astro-cid-yr62jefz> <div class="tag-item" data-astro-cid-yr62jefz> <span class="flag" data-astro-cid-yr62jefz>🇪🇸</span> <code id="configTagEs" data-astro-cid-yr62jefz></code> </div> <div class="tag-item" data-astro-cid-yr62jefz> <span class="flag" data-astro-cid-yr62jefz>🇺🇸</span> <code id="configTagEn" data-astro-cid-yr62jefz></code> </div> </div> </div> </div> </div> <script>(function(){', `
    const amazonUrlInput = document.getElementById('amazonUrl');
    const convertBtn = document.getElementById('convertBtn');
    const errorMessage = document.getElementById('errorMessage');
    const results = document.getElementById('results');

    // Display configured tags
    document.getElementById('configTagEs').textContent = affiliateTags.es.tag;
    document.getElementById('configTagEn').textContent = affiliateTags.en.tag;
    document.getElementById('tagEs').textContent = affiliateTags.es.tag;
    document.getElementById('tagEn').textContent = affiliateTags.en.tag;

    function parseAmazonUrl(url) {
      try {
        // Handle ASIN directly
        if (/^[A-Z0-9]{10}$/i.test(url.trim())) {
          return { asin: url.trim().toUpperCase(), marketplace: 'es' };
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        if (!hostname.includes('amazon.')) {
          return null;
        }

        // Determine marketplace
        let marketplace = 'es';
        if (hostname.includes('amazon.com') && !hostname.includes('amazon.com.')) {
          marketplace = 'com';
        } else if (hostname.includes('amazon.es')) {
          marketplace = 'es';
        } else if (hostname.includes('amazon.co.uk')) {
          marketplace = 'co.uk';
        } else if (hostname.includes('amazon.de')) {
          marketplace = 'de';
        }

        // Extract ASIN
        let asin = null;
        const patterns = [
          /\\\\/dp\\\\/([A-Z0-9]{10})/i,
          /\\\\/gp\\\\/product\\\\/([A-Z0-9]{10})/i,
          /\\\\/gp\\\\/aw\\\\/d\\\\/([A-Z0-9]{10})/i,
          /\\\\/([A-Z0-9]{10})(?:\\\\/|\\\\?|$)/i
        ];

        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            asin = match[1].toUpperCase();
            break;
          }
        }

        if (!asin) return null;

        return { asin, marketplace };
      } catch {
        return null;
      }
    }

    function generateAffiliateUrl(asin, marketplace, tag) {
      return \\\`https://www.amazon.\\\${marketplace}/dp/\\\${asin}?tag=\\\${tag}&linkCode=ogi&th=1&psc=1\\\`;
    }

    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.classList.add('visible');
      results.classList.remove('visible');
    }

    function hideError() {
      errorMessage.classList.remove('visible');
    }

    function convert() {
      const input = amazonUrlInput.value.trim();
      if (!input) {
        showError('Por favor ingresa una URL de Amazon o un ASIN');
        return;
      }

      hideError();

      const parsed = parseAmazonUrl(input);
      if (!parsed) {
        showError('No se pudo extraer el ASIN. Verifica que sea una URL de Amazon valida.');
        return;
      }

      const { asin, marketplace } = parsed;

      // Update meta
      document.getElementById('metaAsin').textContent = asin;
      document.getElementById('metaMarketplace').textContent = \\\`amazon.\\\${marketplace}\\\`;

      // Generate affiliate URLs
      const urlEs = generateAffiliateUrl(asin, 'es', affiliateTags.es.tag);
      const urlEn = generateAffiliateUrl(asin, 'com', affiliateTags.en.tag);

      document.getElementById('urlEs').textContent = urlEs;
      document.getElementById('urlEn').textContent = urlEn;

      results.classList.add('visible');
    }

    // Copy functionality
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-target');
        const urlElement = document.getElementById(targetId);
        const url = urlElement.textContent;

        try {
          await navigator.clipboard.writeText(url);
          btn.classList.add('copied');
          btn.innerHTML = \\\`
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Copiado!
          \\\`;

          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = \\\`
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copiar
            \\\`;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });

    // Event listeners
    convertBtn.addEventListener('click', convert);
    amazonUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        convert();
      }
    });
  })();<\/script> `])), maybeRenderHead(), defineScriptVars({ affiliateTags })) })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/tools/affiliate-link.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/tools/affiliate-link.astro";
const $$url = "/admin/tools/affiliate-link";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$AffiliateLink,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
