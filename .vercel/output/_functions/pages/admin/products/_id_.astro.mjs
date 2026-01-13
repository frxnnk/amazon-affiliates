import { f as createAstro, c as createComponent, a as renderComponent, b as renderTemplate, e as addAttribute, m as maybeRenderHead } from "../../../chunks/astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$AdminLayout } from "../../../chunks/AdminLayout_CsZJh8mb.mjs";
import { c as categories } from "../../../chunks/categories_mZfeSJ8D.mjs";
import { g as getCollection, r as renderEntry } from "../../../chunks/_astro_content_DsUv7PQc.mjs";
/* empty css                                      */
import { renderers } from "../../../renderers.mjs";
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const prerender = false;
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  const products = await getCollection("products");
  const product = products.find((p) => p.data.productId === id);
  if (!product) {
    return Astro2.redirect("/admin/products");
  }
  const { data } = product;
  const { Content } = await renderEntry(product);
  const rawContent = product.body || "";
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": `Editar: ${data.title}`, "data-astro-cid-jwnaoqkz": true }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template(["  ", '<a href="/admin/products" class="back-link" data-astro-cid-jwnaoqkz>&larr; Volver a productos</a> <div id="alert-container" data-astro-cid-jwnaoqkz></div> <div class="form-container" data-astro-cid-jwnaoqkz> <form id="product-form" data-astro-cid-jwnaoqkz> <input type="hidden" id="productId"', ' data-astro-cid-jwnaoqkz> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Informacion Basica</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group full-width" data-astro-cid-jwnaoqkz> <label for="title" data-astro-cid-jwnaoqkz>Titulo *</label> <input type="text" id="title" name="title" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="asin" data-astro-cid-jwnaoqkz>ASIN de Amazon *</label> <input type="text" id="asin" name="asin" required', ' pattern="[A-Z0-9]{10}" data-astro-cid-jwnaoqkz> <p class="help-text" data-astro-cid-jwnaoqkz>10 caracteres alfanumericos</p> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="brand" data-astro-cid-jwnaoqkz>Marca *</label> <input type="text" id="brand" name="brand" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="model" data-astro-cid-jwnaoqkz>Modelo</label> <input type="text" id="model" name="model"', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="lang" data-astro-cid-jwnaoqkz>Idioma *</label> <select id="lang" name="lang" required data-astro-cid-jwnaoqkz> <option value="es"', ' data-astro-cid-jwnaoqkz>Espanol</option> <option value="en"', ' data-astro-cid-jwnaoqkz>English</option> </select> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="category" data-astro-cid-jwnaoqkz>Categoria *</label> <select id="category" name="category" required data-astro-cid-jwnaoqkz> ', ' </select> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="subcategory" data-astro-cid-jwnaoqkz>Subcategoria</label> <input type="text" id="subcategory" name="subcategory"', ' data-astro-cid-jwnaoqkz> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Descripciones</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="shortDescription" data-astro-cid-jwnaoqkz>Descripcion Corta *</label> <input type="text" id="shortDescription" name="shortDescription" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="description" data-astro-cid-jwnaoqkz>Descripcion Completa *</label> <textarea id="description" name="description" required rows="4" data-astro-cid-jwnaoqkz>', '</textarea> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Precios</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="price" data-astro-cid-jwnaoqkz>Precio Actual *</label> <input type="number" id="price" name="price" step="0.01" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="originalPrice" data-astro-cid-jwnaoqkz>Precio Original</label> <input type="number" id="originalPrice" name="originalPrice" step="0.01"', ' data-astro-cid-jwnaoqkz> <p class="help-text" data-astro-cid-jwnaoqkz>Dejar vacio si no hay descuento</p> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="currency" data-astro-cid-jwnaoqkz>Moneda</label> <select id="currency" name="currency" data-astro-cid-jwnaoqkz> <option value="EUR"', ' data-astro-cid-jwnaoqkz>EUR</option> <option value="USD"', ' data-astro-cid-jwnaoqkz>USD</option> </select> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Calificaciones</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="rating" data-astro-cid-jwnaoqkz>Rating Amazon (0-5) *</label> <input type="number" id="rating" name="rating" step="0.1" min="0" max="5" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="totalReviews" data-astro-cid-jwnaoqkz>Total de Reviews</label> <input type="number" id="totalReviews" name="totalReviews"', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="ourRating" data-astro-cid-jwnaoqkz>Nuestra Calificacion (0-10)</label> <input type="number" id="ourRating" name="ourRating" step="0.1" min="0" max="10"', ' data-astro-cid-jwnaoqkz> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Imagen Destacada</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group full-width" data-astro-cid-jwnaoqkz> <label for="featuredImageUrl" data-astro-cid-jwnaoqkz>URL de la Imagen *</label> <input type="url" id="featuredImageUrl" name="featuredImageUrl" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group full-width" data-astro-cid-jwnaoqkz> <label for="featuredImageAlt" data-astro-cid-jwnaoqkz>Texto Alternativo</label> <input type="text" id="featuredImageAlt" name="featuredImageAlt"', ' data-astro-cid-jwnaoqkz> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Pros y Contras</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label data-astro-cid-jwnaoqkz>Ventajas (Pros)</label> <div id="pros-container" class="array-input" data-astro-cid-jwnaoqkz> ', " ", ` </div> <button type="button" class="btn-add" onclick="addArrayInput('pros-container', 'pros[]')" data-astro-cid-jwnaoqkz>+ Agregar Pro</button> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label data-astro-cid-jwnaoqkz>Desventajas (Contras)</label> <div id="cons-container" class="array-input" data-astro-cid-jwnaoqkz> `, " ", ` </div> <button type="button" class="btn-add" onclick="addArrayInput('cons-container', 'cons[]')" data-astro-cid-jwnaoqkz>+ Agregar Contra</button> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Tags</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="tags" data-astro-cid-jwnaoqkz>Tags (separados por coma)</label> <input type="text" id="tags" name="tags"`, ' data-astro-cid-jwnaoqkz> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Enlace de Afiliado</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="affiliateUrl" data-astro-cid-jwnaoqkz>URL de Afiliado</label> <input type="url" id="affiliateUrl" name="affiliateUrl"', ' data-astro-cid-jwnaoqkz> <p class="help-text" data-astro-cid-jwnaoqkz>Dejar vacio para generar automaticamente desde el ASIN</p> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Publicacion</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="status" data-astro-cid-jwnaoqkz>Estado</label> <select id="status" name="status" data-astro-cid-jwnaoqkz> <option value="draft"', ' data-astro-cid-jwnaoqkz>Borrador</option> <option value="published"', ' data-astro-cid-jwnaoqkz>Publicado</option> </select> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <div class="checkbox-group" data-astro-cid-jwnaoqkz> <label class="checkbox-label" data-astro-cid-jwnaoqkz> <input type="checkbox" id="isFeatured" name="isFeatured"', ' data-astro-cid-jwnaoqkz>\nDestacado\n</label> <label class="checkbox-label" data-astro-cid-jwnaoqkz> <input type="checkbox" id="isOnSale" name="isOnSale"', ' data-astro-cid-jwnaoqkz>\nEn Oferta\n</label> </div> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Contenido Adicional (Markdown)</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="content" data-astro-cid-jwnaoqkz>Contenido</label> <textarea id="content" name="content" rows="8" data-astro-cid-jwnaoqkz>', `</textarea> </div> </fieldset> <div class="form-actions" data-astro-cid-jwnaoqkz> <div class="actions-left" data-astro-cid-jwnaoqkz> <button type="button" class="btn-danger" id="delete-btn" data-astro-cid-jwnaoqkz>Eliminar</button> </div> <div data-astro-cid-jwnaoqkz> <a href="/admin/products" class="btn-secondary" data-astro-cid-jwnaoqkz>Cancelar</a> <button type="submit" class="btn-primary" id="submit-btn" data-astro-cid-jwnaoqkz>Guardar Cambios</button> </div> </div> </form> </div> <script>
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
      const productId = document.getElementById('productId').value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';

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
        const response = await fetch(\`/api/admin/products/\${productId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          alertContainer.innerHTML = \`
            <div class="alert alert-success">
              Producto actualizado exitosamente.
              <br><a href="/admin/products">Volver a la lista de productos</a>
            </div>
          \`;
        } else {
          throw new Error(result.error || 'Error al actualizar el producto');
        }
      } catch (error) {
        alertContainer.innerHTML = \`
          <div class="alert alert-error">
            Error: \${error.message}
          </div>
        \`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Cambios';
      }
    });

    document.getElementById('delete-btn').addEventListener('click', async () => {
      if (!confirm('¿Estas seguro de que deseas eliminar este producto? Esta accion no se puede deshacer.')) {
        return;
      }

      const productId = document.getElementById('productId').value;
      const alertContainer = document.getElementById('alert-container');
      const deleteBtn = document.getElementById('delete-btn');

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Eliminando...';

      try {
        const response = await fetch(\`/api/admin/products/\${productId}\`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (response.ok) {
          alertContainer.innerHTML = \`
            <div class="alert alert-success">
              Producto eliminado exitosamente. Redirigiendo...
            </div>
          \`;
          setTimeout(() => {
            window.location.href = '/admin/products';
          }, 1500);
        } else {
          throw new Error(result.error || 'Error al eliminar el producto');
        }
      } catch (error) {
        alertContainer.innerHTML = \`
          <div class="alert alert-error">
            Error: \${error.message}
          </div>
        \`;
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Eliminar';
      }
    });
  <\/script> `], ["  ", '<a href="/admin/products" class="back-link" data-astro-cid-jwnaoqkz>&larr; Volver a productos</a> <div id="alert-container" data-astro-cid-jwnaoqkz></div> <div class="form-container" data-astro-cid-jwnaoqkz> <form id="product-form" data-astro-cid-jwnaoqkz> <input type="hidden" id="productId"', ' data-astro-cid-jwnaoqkz> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Informacion Basica</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group full-width" data-astro-cid-jwnaoqkz> <label for="title" data-astro-cid-jwnaoqkz>Titulo *</label> <input type="text" id="title" name="title" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="asin" data-astro-cid-jwnaoqkz>ASIN de Amazon *</label> <input type="text" id="asin" name="asin" required', ' pattern="[A-Z0-9]{10}" data-astro-cid-jwnaoqkz> <p class="help-text" data-astro-cid-jwnaoqkz>10 caracteres alfanumericos</p> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="brand" data-astro-cid-jwnaoqkz>Marca *</label> <input type="text" id="brand" name="brand" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="model" data-astro-cid-jwnaoqkz>Modelo</label> <input type="text" id="model" name="model"', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="lang" data-astro-cid-jwnaoqkz>Idioma *</label> <select id="lang" name="lang" required data-astro-cid-jwnaoqkz> <option value="es"', ' data-astro-cid-jwnaoqkz>Espanol</option> <option value="en"', ' data-astro-cid-jwnaoqkz>English</option> </select> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="category" data-astro-cid-jwnaoqkz>Categoria *</label> <select id="category" name="category" required data-astro-cid-jwnaoqkz> ', ' </select> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="subcategory" data-astro-cid-jwnaoqkz>Subcategoria</label> <input type="text" id="subcategory" name="subcategory"', ' data-astro-cid-jwnaoqkz> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Descripciones</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="shortDescription" data-astro-cid-jwnaoqkz>Descripcion Corta *</label> <input type="text" id="shortDescription" name="shortDescription" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="description" data-astro-cid-jwnaoqkz>Descripcion Completa *</label> <textarea id="description" name="description" required rows="4" data-astro-cid-jwnaoqkz>', '</textarea> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Precios</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="price" data-astro-cid-jwnaoqkz>Precio Actual *</label> <input type="number" id="price" name="price" step="0.01" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="originalPrice" data-astro-cid-jwnaoqkz>Precio Original</label> <input type="number" id="originalPrice" name="originalPrice" step="0.01"', ' data-astro-cid-jwnaoqkz> <p class="help-text" data-astro-cid-jwnaoqkz>Dejar vacio si no hay descuento</p> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="currency" data-astro-cid-jwnaoqkz>Moneda</label> <select id="currency" name="currency" data-astro-cid-jwnaoqkz> <option value="EUR"', ' data-astro-cid-jwnaoqkz>EUR</option> <option value="USD"', ' data-astro-cid-jwnaoqkz>USD</option> </select> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Calificaciones</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="rating" data-astro-cid-jwnaoqkz>Rating Amazon (0-5) *</label> <input type="number" id="rating" name="rating" step="0.1" min="0" max="5" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="totalReviews" data-astro-cid-jwnaoqkz>Total de Reviews</label> <input type="number" id="totalReviews" name="totalReviews"', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="ourRating" data-astro-cid-jwnaoqkz>Nuestra Calificacion (0-10)</label> <input type="number" id="ourRating" name="ourRating" step="0.1" min="0" max="10"', ' data-astro-cid-jwnaoqkz> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Imagen Destacada</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group full-width" data-astro-cid-jwnaoqkz> <label for="featuredImageUrl" data-astro-cid-jwnaoqkz>URL de la Imagen *</label> <input type="url" id="featuredImageUrl" name="featuredImageUrl" required', ' data-astro-cid-jwnaoqkz> </div> <div class="form-group full-width" data-astro-cid-jwnaoqkz> <label for="featuredImageAlt" data-astro-cid-jwnaoqkz>Texto Alternativo</label> <input type="text" id="featuredImageAlt" name="featuredImageAlt"', ' data-astro-cid-jwnaoqkz> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Pros y Contras</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label data-astro-cid-jwnaoqkz>Ventajas (Pros)</label> <div id="pros-container" class="array-input" data-astro-cid-jwnaoqkz> ', " ", ` </div> <button type="button" class="btn-add" onclick="addArrayInput('pros-container', 'pros[]')" data-astro-cid-jwnaoqkz>+ Agregar Pro</button> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <label data-astro-cid-jwnaoqkz>Desventajas (Contras)</label> <div id="cons-container" class="array-input" data-astro-cid-jwnaoqkz> `, " ", ` </div> <button type="button" class="btn-add" onclick="addArrayInput('cons-container', 'cons[]')" data-astro-cid-jwnaoqkz>+ Agregar Contra</button> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Tags</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="tags" data-astro-cid-jwnaoqkz>Tags (separados por coma)</label> <input type="text" id="tags" name="tags"`, ' data-astro-cid-jwnaoqkz> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Enlace de Afiliado</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="affiliateUrl" data-astro-cid-jwnaoqkz>URL de Afiliado</label> <input type="url" id="affiliateUrl" name="affiliateUrl"', ' data-astro-cid-jwnaoqkz> <p class="help-text" data-astro-cid-jwnaoqkz>Dejar vacio para generar automaticamente desde el ASIN</p> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Publicacion</legend> <div class="form-grid" data-astro-cid-jwnaoqkz> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="status" data-astro-cid-jwnaoqkz>Estado</label> <select id="status" name="status" data-astro-cid-jwnaoqkz> <option value="draft"', ' data-astro-cid-jwnaoqkz>Borrador</option> <option value="published"', ' data-astro-cid-jwnaoqkz>Publicado</option> </select> </div> <div class="form-group" data-astro-cid-jwnaoqkz> <div class="checkbox-group" data-astro-cid-jwnaoqkz> <label class="checkbox-label" data-astro-cid-jwnaoqkz> <input type="checkbox" id="isFeatured" name="isFeatured"', ' data-astro-cid-jwnaoqkz>\nDestacado\n</label> <label class="checkbox-label" data-astro-cid-jwnaoqkz> <input type="checkbox" id="isOnSale" name="isOnSale"', ' data-astro-cid-jwnaoqkz>\nEn Oferta\n</label> </div> </div> </div> </fieldset> <fieldset data-astro-cid-jwnaoqkz> <legend data-astro-cid-jwnaoqkz>Contenido Adicional (Markdown)</legend> <div class="form-group" data-astro-cid-jwnaoqkz> <label for="content" data-astro-cid-jwnaoqkz>Contenido</label> <textarea id="content" name="content" rows="8" data-astro-cid-jwnaoqkz>', `</textarea> </div> </fieldset> <div class="form-actions" data-astro-cid-jwnaoqkz> <div class="actions-left" data-astro-cid-jwnaoqkz> <button type="button" class="btn-danger" id="delete-btn" data-astro-cid-jwnaoqkz>Eliminar</button> </div> <div data-astro-cid-jwnaoqkz> <a href="/admin/products" class="btn-secondary" data-astro-cid-jwnaoqkz>Cancelar</a> <button type="submit" class="btn-primary" id="submit-btn" data-astro-cid-jwnaoqkz>Guardar Cambios</button> </div> </div> </form> </div> <script>
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
      const productId = document.getElementById('productId').value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';

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
        const response = await fetch(\\\`/api/admin/products/\\\${productId}\\\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          alertContainer.innerHTML = \\\`
            <div class="alert alert-success">
              Producto actualizado exitosamente.
              <br><a href="/admin/products">Volver a la lista de productos</a>
            </div>
          \\\`;
        } else {
          throw new Error(result.error || 'Error al actualizar el producto');
        }
      } catch (error) {
        alertContainer.innerHTML = \\\`
          <div class="alert alert-error">
            Error: \\\${error.message}
          </div>
        \\\`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Cambios';
      }
    });

    document.getElementById('delete-btn').addEventListener('click', async () => {
      if (!confirm('¿Estas seguro de que deseas eliminar este producto? Esta accion no se puede deshacer.')) {
        return;
      }

      const productId = document.getElementById('productId').value;
      const alertContainer = document.getElementById('alert-container');
      const deleteBtn = document.getElementById('delete-btn');

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Eliminando...';

      try {
        const response = await fetch(\\\`/api/admin/products/\\\${productId}\\\`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (response.ok) {
          alertContainer.innerHTML = \\\`
            <div class="alert alert-success">
              Producto eliminado exitosamente. Redirigiendo...
            </div>
          \\\`;
          setTimeout(() => {
            window.location.href = '/admin/products';
          }, 1500);
        } else {
          throw new Error(result.error || 'Error al eliminar el producto');
        }
      } catch (error) {
        alertContainer.innerHTML = \\\`
          <div class="alert alert-error">
            Error: \\\${error.message}
          </div>
        \\\`;
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Eliminar';
      }
    });
  <\/script> `])), maybeRenderHead(), addAttribute(id, "value"), addAttribute(data.title, "value"), addAttribute(data.asin, "value"), addAttribute(data.brand, "value"), addAttribute(data.model || "", "value"), addAttribute(data.lang === "es", "selected"), addAttribute(data.lang === "en", "selected"), categories.categories.map((cat) => renderTemplate`<option${addAttribute(cat.id, "value")}${addAttribute(data.category === cat.id, "selected")} data-astro-cid-jwnaoqkz>${cat.name.es}</option>`), addAttribute(data.subcategory || "", "value"), addAttribute(data.shortDescription, "value"), data.description, addAttribute(data.price, "value"), addAttribute(data.originalPrice || "", "value"), addAttribute(data.currency === "EUR", "selected"), addAttribute(data.currency === "USD", "selected"), addAttribute(data.rating, "value"), addAttribute(data.totalReviews || "", "value"), addAttribute(data.ourRating || "", "value"), addAttribute(data.featuredImage?.url || "", "value"), addAttribute(data.featuredImage?.alt || "", "value"), (data.pros || []).map((pro) => renderTemplate`<div class="array-input-row" data-astro-cid-jwnaoqkz> <input type="text" name="pros[]"${addAttribute(pro, "value")} data-astro-cid-jwnaoqkz> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-jwnaoqkz>X</button> </div>`), (!data.pros || data.pros.length === 0) && renderTemplate`<div class="array-input-row" data-astro-cid-jwnaoqkz> <input type="text" name="pros[]" placeholder="Agregar ventaja" data-astro-cid-jwnaoqkz> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-jwnaoqkz>X</button> </div>`, (data.cons || []).map((con) => renderTemplate`<div class="array-input-row" data-astro-cid-jwnaoqkz> <input type="text" name="cons[]"${addAttribute(con, "value")} data-astro-cid-jwnaoqkz> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-jwnaoqkz>X</button> </div>`), (!data.cons || data.cons.length === 0) && renderTemplate`<div class="array-input-row" data-astro-cid-jwnaoqkz> <input type="text" name="cons[]" placeholder="Agregar desventaja" data-astro-cid-jwnaoqkz> <button type="button" class="btn-remove" onclick="this.parentElement.remove()" data-astro-cid-jwnaoqkz>X</button> </div>`, addAttribute((data.tags || []).join(", "), "value"), addAttribute(data.affiliateUrl || "", "value"), addAttribute(data.status === "draft", "selected"), addAttribute(data.status === "published", "selected"), addAttribute(data.isFeatured, "checked"), addAttribute(data.isOnSale, "checked"), rawContent) })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/products/[id].astro", void 0);
const $$file = "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/src/pages/admin/products/[id].astro";
const $$url = "/admin/products/[id]";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
