import { c as createComponent, a as renderComponent, b as renderTemplate, e as addAttribute, m as maybeRenderHead } from "../../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$AdminLayout } from "../../../chunks/AdminLayout_CsZJh8mb.mjs";
import { c as categories } from "../../../chunks/categories_mZfeSJ8D.mjs";
/* empty css                                     */
import { renderers } from "../../../renderers.mjs";
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const prerender = false;
const $$New = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "Nuevo Producto", "data-astro-cid-unfxests": true }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template(["  ", '<a href="/admin/products" class="back-link" data-astro-cid-unfxests>&larr; Volver a productos</a> <div id="alert-container" data-astro-cid-unfxests></div> <div class="form-container" data-astro-cid-unfxests> <form id="product-form" data-astro-cid-unfxests> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Informacion Basica</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group full-width" data-astro-cid-unfxests> <label for="title" data-astro-cid-unfxests>Titulo *</label> <input type="text" id="title" name="title" required placeholder="Ej: Sony WH-1000XM5 Auriculares" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="asin" data-astro-cid-unfxests>ASIN de Amazon *</label> <input type="text" id="asin" name="asin" required placeholder="B09XS7JWHH" pattern="[A-Z0-9]{10}" data-astro-cid-unfxests> <p class="help-text" data-astro-cid-unfxests>10 caracteres alfanumericos</p> </div> <div class="form-group" data-astro-cid-unfxests> <label for="brand" data-astro-cid-unfxests>Marca *</label> <input type="text" id="brand" name="brand" required placeholder="Sony" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="model" data-astro-cid-unfxests>Modelo</label> <input type="text" id="model" name="model" placeholder="WH-1000XM5" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="lang" data-astro-cid-unfxests>Idioma *</label> <select id="lang" name="lang" required data-astro-cid-unfxests> <option value="es" data-astro-cid-unfxests>Espanol</option> <option value="en" data-astro-cid-unfxests>English</option> </select> </div> <div class="form-group" data-astro-cid-unfxests> <label for="category" data-astro-cid-unfxests>Categoria *</label> <select id="category" name="category" required data-astro-cid-unfxests> ', ` </select> </div> <div class="form-group" data-astro-cid-unfxests> <label for="subcategory" data-astro-cid-unfxests>Subcategoria</label> <input type="text" id="subcategory" name="subcategory" placeholder="headphones" data-astro-cid-unfxests> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Descripciones</legend> <div class="form-group" data-astro-cid-unfxests> <label for="shortDescription" data-astro-cid-unfxests>Descripcion Corta *</label> <input type="text" id="shortDescription" name="shortDescription" required placeholder="Auriculares premium con cancelacion de ruido" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="description" data-astro-cid-unfxests>Descripcion Completa *</label> <textarea id="description" name="description" required rows="4" placeholder="Descripcion detallada del producto..." data-astro-cid-unfxests></textarea> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Precios</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label for="price" data-astro-cid-unfxests>Precio Actual *</label> <input type="number" id="price" name="price" step="0.01" required placeholder="349.00" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="originalPrice" data-astro-cid-unfxests>Precio Original</label> <input type="number" id="originalPrice" name="originalPrice" step="0.01" placeholder="419.00" data-astro-cid-unfxests> <p class="help-text" data-astro-cid-unfxests>Dejar vacio si no hay descuento</p> </div> <div class="form-group" data-astro-cid-unfxests> <label for="currency" data-astro-cid-unfxests>Moneda</label> <select id="currency" name="currency" data-astro-cid-unfxests> <option value="EUR" data-astro-cid-unfxests>EUR</option> <option value="USD" data-astro-cid-unfxests>USD</option> </select> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Calificaciones</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label for="rating" data-astro-cid-unfxests>Rating Amazon (0-5) *</label> <input type="number" id="rating" name="rating" step="0.1" min="0" max="5" required placeholder="4.7" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="totalReviews" data-astro-cid-unfxests>Total de Reviews</label> <input type="number" id="totalReviews" name="totalReviews" placeholder="12453" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="ourRating" data-astro-cid-unfxests>Nuestra Calificacion (0-10)</label> <input type="number" id="ourRating" name="ourRating" step="0.1" min="0" max="10" placeholder="9.2" data-astro-cid-unfxests> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Imagen Destacada</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group full-width" data-astro-cid-unfxests> <label for="featuredImageUrl" data-astro-cid-unfxests>URL de la Imagen *</label> <input type="url" id="featuredImageUrl" name="featuredImageUrl" required placeholder="https://m.media-amazon.com/images/..." data-astro-cid-unfxests> </div> <div class="form-group full-width" data-astro-cid-unfxests> <label for="featuredImageAlt" data-astro-cid-unfxests>Texto Alternativo</label> <input type="text" id="featuredImageAlt" name="featuredImageAlt" placeholder="Sony WH-1000XM5 auriculares" data-astro-cid-unfxests> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Pros y Contras</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label data-astro-cid-unfxests>Ventajas (Pros)</label> <div id="pros-container" class="array-input" data-astro-cid-unfxests> <div class="array-input-row" data-astro-cid-unfxests> <input type="text" name="pros[]" placeholder="Excelente calidad de sonido" data-astro-cid-unfxests> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-unfxests>X</button> </div> </div> <button type="button" class="btn-add" onclick="addArrayInput('pros-container', 'pros[]')" data-astro-cid-unfxests>+ Agregar Pro</button> </div> <div class="form-group" data-astro-cid-unfxests> <label data-astro-cid-unfxests>Desventajas (Contras)</label> <div id="cons-container" class="array-input" data-astro-cid-unfxests> <div class="array-input-row" data-astro-cid-unfxests> <input type="text" name="cons[]" placeholder="Precio elevado" data-astro-cid-unfxests> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-unfxests>X</button> </div> </div> <button type="button" class="btn-add" onclick="addArrayInput('cons-container', 'cons[]')" data-astro-cid-unfxests>+ Agregar Contra</button> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Tags</legend> <div class="form-group" data-astro-cid-unfxests> <label for="tags" data-astro-cid-unfxests>Tags (separados por coma)</label> <input type="text" id="tags" name="tags" placeholder="auriculares, bluetooth, cancelacion-ruido, sony" data-astro-cid-unfxests> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Enlace de Afiliado</legend> <div class="form-group" data-astro-cid-unfxests> <label for="affiliateUrl" data-astro-cid-unfxests>URL de Afiliado</label> <input type="url" id="affiliateUrl" name="affiliateUrl" placeholder="https://www.amazon.es/dp/B09XS7JWHH" data-astro-cid-unfxests> <p class="help-text" data-astro-cid-unfxests>Dejar vacio para generar automaticamente desde el ASIN</p> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Publicacion</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label for="status" data-astro-cid-unfxests>Estado</label> <select id="status" name="status" data-astro-cid-unfxests> <option value="draft" data-astro-cid-unfxests>Borrador</option> <option value="published" data-astro-cid-unfxests>Publicado</option> </select> </div> <div class="form-group" data-astro-cid-unfxests> <div class="checkbox-group" data-astro-cid-unfxests> <label class="checkbox-label" data-astro-cid-unfxests> <input type="checkbox" id="isFeatured" name="isFeatured" data-astro-cid-unfxests>
Destacado
</label> <label class="checkbox-label" data-astro-cid-unfxests> <input type="checkbox" id="isOnSale" name="isOnSale" data-astro-cid-unfxests>
En Oferta
</label> </div> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Contenido Adicional (Markdown)</legend> <div class="form-group" data-astro-cid-unfxests> <label for="content" data-astro-cid-unfxests>Contenido</label> <textarea id="content" name="content" rows="8" placeholder="## Caracteristicas principales

Escribe aqui contenido adicional en Markdown..." data-astro-cid-unfxests></textarea> </div> </fieldset> <div class="form-actions" data-astro-cid-unfxests> <a href="/admin/products" class="btn-secondary" data-astro-cid-unfxests>Cancelar</a> <button type="submit" class="btn-primary" id="submit-btn" data-astro-cid-unfxests>Crear Producto</button> </div> </form> </div> <script>
    function addArrayInput(containerId, inputName) {
      const container = document.getElementById(containerId);
      const row = document.createElement('div');
      row.className = 'array-input-row';
      row.innerHTML = \`
        <input type="text" name="\${inputName}" placeholder="" />
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>
      \`;
      container.appendChild(row);
    }

    document.getElementById('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const form = e.target;
      const submitBtn = document.getElementById('submit-btn');
      const alertContainer = document.getElementById('alert-container');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando...';

      // Collect form data
      const formData = new FormData(form);
      const prosInputs = form.querySelectorAll('input[name="pros[]"]');
      const consInputs = form.querySelectorAll('input[name="cons[]"]');

      const data = {
        title: formData.get('title'),
        asin: formData.get('asin'),
        brand: formData.get('brand'),
        model: formData.get('model') || undefined,
        lang: formData.get('lang'),
        category: formData.get('category'),
        subcategory: formData.get('subcategory') || undefined,
        shortDescription: formData.get('shortDescription'),
        description: formData.get('description'),
        price: formData.get('price'),
        originalPrice: formData.get('originalPrice') || undefined,
        currency: formData.get('currency'),
        rating: formData.get('rating'),
        totalReviews: formData.get('totalReviews') || undefined,
        ourRating: formData.get('ourRating') || undefined,
        featuredImage: {
          url: formData.get('featuredImageUrl'),
          alt: formData.get('featuredImageAlt') || formData.get('title'),
        },
        pros: Array.from(prosInputs).map(input => input.value).filter(v => v.trim()),
        cons: Array.from(consInputs).map(input => input.value).filter(v => v.trim()),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : [],
        affiliateUrl: formData.get('affiliateUrl') || undefined,
        status: formData.get('status'),
        isFeatured: formData.get('isFeatured') === 'on',
        isOnSale: formData.get('isOnSale') === 'on',
        content: formData.get('content') || '',
      };

      try {
        const response = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          alertContainer.innerHTML = \`
            <div class="alert alert-success">
              Producto creado exitosamente. El sitio se reconstruira en unos minutos.
              <br><a href="/admin/products">Volver a la lista de productos</a>
            </div>
          \`;
          form.reset();
        } else {
          throw new Error(result.error || 'Error al crear el producto');
        }
      } catch (error) {
        alertContainer.innerHTML = \`
          <div class="alert alert-error">
            Error: \${error.message}
          </div>
        \`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear Producto';
      }
    });
  <\/script> `], ["  ", '<a href="/admin/products" class="back-link" data-astro-cid-unfxests>&larr; Volver a productos</a> <div id="alert-container" data-astro-cid-unfxests></div> <div class="form-container" data-astro-cid-unfxests> <form id="product-form" data-astro-cid-unfxests> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Informacion Basica</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group full-width" data-astro-cid-unfxests> <label for="title" data-astro-cid-unfxests>Titulo *</label> <input type="text" id="title" name="title" required placeholder="Ej: Sony WH-1000XM5 Auriculares" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="asin" data-astro-cid-unfxests>ASIN de Amazon *</label> <input type="text" id="asin" name="asin" required placeholder="B09XS7JWHH" pattern="[A-Z0-9]{10}" data-astro-cid-unfxests> <p class="help-text" data-astro-cid-unfxests>10 caracteres alfanumericos</p> </div> <div class="form-group" data-astro-cid-unfxests> <label for="brand" data-astro-cid-unfxests>Marca *</label> <input type="text" id="brand" name="brand" required placeholder="Sony" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="model" data-astro-cid-unfxests>Modelo</label> <input type="text" id="model" name="model" placeholder="WH-1000XM5" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="lang" data-astro-cid-unfxests>Idioma *</label> <select id="lang" name="lang" required data-astro-cid-unfxests> <option value="es" data-astro-cid-unfxests>Espanol</option> <option value="en" data-astro-cid-unfxests>English</option> </select> </div> <div class="form-group" data-astro-cid-unfxests> <label for="category" data-astro-cid-unfxests>Categoria *</label> <select id="category" name="category" required data-astro-cid-unfxests> ', ` </select> </div> <div class="form-group" data-astro-cid-unfxests> <label for="subcategory" data-astro-cid-unfxests>Subcategoria</label> <input type="text" id="subcategory" name="subcategory" placeholder="headphones" data-astro-cid-unfxests> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Descripciones</legend> <div class="form-group" data-astro-cid-unfxests> <label for="shortDescription" data-astro-cid-unfxests>Descripcion Corta *</label> <input type="text" id="shortDescription" name="shortDescription" required placeholder="Auriculares premium con cancelacion de ruido" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="description" data-astro-cid-unfxests>Descripcion Completa *</label> <textarea id="description" name="description" required rows="4" placeholder="Descripcion detallada del producto..." data-astro-cid-unfxests></textarea> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Precios</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label for="price" data-astro-cid-unfxests>Precio Actual *</label> <input type="number" id="price" name="price" step="0.01" required placeholder="349.00" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="originalPrice" data-astro-cid-unfxests>Precio Original</label> <input type="number" id="originalPrice" name="originalPrice" step="0.01" placeholder="419.00" data-astro-cid-unfxests> <p class="help-text" data-astro-cid-unfxests>Dejar vacio si no hay descuento</p> </div> <div class="form-group" data-astro-cid-unfxests> <label for="currency" data-astro-cid-unfxests>Moneda</label> <select id="currency" name="currency" data-astro-cid-unfxests> <option value="EUR" data-astro-cid-unfxests>EUR</option> <option value="USD" data-astro-cid-unfxests>USD</option> </select> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Calificaciones</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label for="rating" data-astro-cid-unfxests>Rating Amazon (0-5) *</label> <input type="number" id="rating" name="rating" step="0.1" min="0" max="5" required placeholder="4.7" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="totalReviews" data-astro-cid-unfxests>Total de Reviews</label> <input type="number" id="totalReviews" name="totalReviews" placeholder="12453" data-astro-cid-unfxests> </div> <div class="form-group" data-astro-cid-unfxests> <label for="ourRating" data-astro-cid-unfxests>Nuestra Calificacion (0-10)</label> <input type="number" id="ourRating" name="ourRating" step="0.1" min="0" max="10" placeholder="9.2" data-astro-cid-unfxests> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Imagen Destacada</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group full-width" data-astro-cid-unfxests> <label for="featuredImageUrl" data-astro-cid-unfxests>URL de la Imagen *</label> <input type="url" id="featuredImageUrl" name="featuredImageUrl" required placeholder="https://m.media-amazon.com/images/..." data-astro-cid-unfxests> </div> <div class="form-group full-width" data-astro-cid-unfxests> <label for="featuredImageAlt" data-astro-cid-unfxests>Texto Alternativo</label> <input type="text" id="featuredImageAlt" name="featuredImageAlt" placeholder="Sony WH-1000XM5 auriculares" data-astro-cid-unfxests> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Pros y Contras</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label data-astro-cid-unfxests>Ventajas (Pros)</label> <div id="pros-container" class="array-input" data-astro-cid-unfxests> <div class="array-input-row" data-astro-cid-unfxests> <input type="text" name="pros[]" placeholder="Excelente calidad de sonido" data-astro-cid-unfxests> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-unfxests>X</button> </div> </div> <button type="button" class="btn-add" onclick="addArrayInput('pros-container', 'pros[]')" data-astro-cid-unfxests>+ Agregar Pro</button> </div> <div class="form-group" data-astro-cid-unfxests> <label data-astro-cid-unfxests>Desventajas (Contras)</label> <div id="cons-container" class="array-input" data-astro-cid-unfxests> <div class="array-input-row" data-astro-cid-unfxests> <input type="text" name="cons[]" placeholder="Precio elevado" data-astro-cid-unfxests> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-unfxests>X</button> </div> </div> <button type="button" class="btn-add" onclick="addArrayInput('cons-container', 'cons[]')" data-astro-cid-unfxests>+ Agregar Contra</button> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Tags</legend> <div class="form-group" data-astro-cid-unfxests> <label for="tags" data-astro-cid-unfxests>Tags (separados por coma)</label> <input type="text" id="tags" name="tags" placeholder="auriculares, bluetooth, cancelacion-ruido, sony" data-astro-cid-unfxests> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Enlace de Afiliado</legend> <div class="form-group" data-astro-cid-unfxests> <label for="affiliateUrl" data-astro-cid-unfxests>URL de Afiliado</label> <input type="url" id="affiliateUrl" name="affiliateUrl" placeholder="https://www.amazon.es/dp/B09XS7JWHH" data-astro-cid-unfxests> <p class="help-text" data-astro-cid-unfxests>Dejar vacio para generar automaticamente desde el ASIN</p> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Publicacion</legend> <div class="form-grid" data-astro-cid-unfxests> <div class="form-group" data-astro-cid-unfxests> <label for="status" data-astro-cid-unfxests>Estado</label> <select id="status" name="status" data-astro-cid-unfxests> <option value="draft" data-astro-cid-unfxests>Borrador</option> <option value="published" data-astro-cid-unfxests>Publicado</option> </select> </div> <div class="form-group" data-astro-cid-unfxests> <div class="checkbox-group" data-astro-cid-unfxests> <label class="checkbox-label" data-astro-cid-unfxests> <input type="checkbox" id="isFeatured" name="isFeatured" data-astro-cid-unfxests>
Destacado
</label> <label class="checkbox-label" data-astro-cid-unfxests> <input type="checkbox" id="isOnSale" name="isOnSale" data-astro-cid-unfxests>
En Oferta
</label> </div> </div> </div> </fieldset> <fieldset data-astro-cid-unfxests> <legend data-astro-cid-unfxests>Contenido Adicional (Markdown)</legend> <div class="form-group" data-astro-cid-unfxests> <label for="content" data-astro-cid-unfxests>Contenido</label> <textarea id="content" name="content" rows="8" placeholder="## Caracteristicas principales

Escribe aqui contenido adicional en Markdown..." data-astro-cid-unfxests></textarea> </div> </fieldset> <div class="form-actions" data-astro-cid-unfxests> <a href="/admin/products" class="btn-secondary" data-astro-cid-unfxests>Cancelar</a> <button type="submit" class="btn-primary" id="submit-btn" data-astro-cid-unfxests>Crear Producto</button> </div> </form> </div> <script>
    function addArrayInput(containerId, inputName) {
      const container = document.getElementById(containerId);
      const row = document.createElement('div');
      row.className = 'array-input-row';
      row.innerHTML = \\\`
        <input type="text" name="\\\${inputName}" placeholder="" />
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">X</button>
      \\\`;
      container.appendChild(row);
    }

    document.getElementById('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const form = e.target;
      const submitBtn = document.getElementById('submit-btn');
      const alertContainer = document.getElementById('alert-container');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando...';

      // Collect form data
      const formData = new FormData(form);
      const prosInputs = form.querySelectorAll('input[name="pros[]"]');
      const consInputs = form.querySelectorAll('input[name="cons[]"]');

      const data = {
        title: formData.get('title'),
        asin: formData.get('asin'),
        brand: formData.get('brand'),
        model: formData.get('model') || undefined,
        lang: formData.get('lang'),
        category: formData.get('category'),
        subcategory: formData.get('subcategory') || undefined,
        shortDescription: formData.get('shortDescription'),
        description: formData.get('description'),
        price: formData.get('price'),
        originalPrice: formData.get('originalPrice') || undefined,
        currency: formData.get('currency'),
        rating: formData.get('rating'),
        totalReviews: formData.get('totalReviews') || undefined,
        ourRating: formData.get('ourRating') || undefined,
        featuredImage: {
          url: formData.get('featuredImageUrl'),
          alt: formData.get('featuredImageAlt') || formData.get('title'),
        },
        pros: Array.from(prosInputs).map(input => input.value).filter(v => v.trim()),
        cons: Array.from(consInputs).map(input => input.value).filter(v => v.trim()),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(t => t) : [],
        affiliateUrl: formData.get('affiliateUrl') || undefined,
        status: formData.get('status'),
        isFeatured: formData.get('isFeatured') === 'on',
        isOnSale: formData.get('isOnSale') === 'on',
        content: formData.get('content') || '',
      };

      try {
        const response = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          alertContainer.innerHTML = \\\`
            <div class="alert alert-success">
              Producto creado exitosamente. El sitio se reconstruira en unos minutos.
              <br><a href="/admin/products">Volver a la lista de productos</a>
            </div>
          \\\`;
          form.reset();
        } else {
          throw new Error(result.error || 'Error al crear el producto');
        }
      } catch (error) {
        alertContainer.innerHTML = \\\`
          <div class="alert alert-error">
            Error: \\\${error.message}
          </div>
        \\\`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear Producto';
      }
    });
  <\/script> `])), maybeRenderHead(), categories.categories.map((cat) => renderTemplate`<option${addAttribute(cat.id, "value")} data-astro-cid-unfxests>${cat.name.es}</option>`)) })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/products/new.astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/products/new.astro";
const $$url = "/admin/products/new";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$New,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
