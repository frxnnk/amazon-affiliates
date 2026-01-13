import { s as slugify, g as generateListMarkdown, a as generateListFilename } from "../../../chunks/markdown_DdU4YeJ3.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { renderers } from "../../../renderers.mjs";
const POST = async ({ request, locals }) => {
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const data = await request.json();
    if (!data.title || !data.listType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, listType" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const listId = data.listId || slugify(data.title);
    const lang = data.lang || "es";
    const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const frontmatter = {
      listId,
      lang,
      title: data.title,
      subtitle: data.subtitle || void 0,
      excerpt: data.excerpt || "",
      listType: data.listType,
      visibility: data.visibility || "public",
      products: (data.products || []).map((p, index) => ({
        productId: p.productId,
        position: p.position || index + 1,
        badge: p.badge || void 0,
        miniReview: p.miniReview || void 0
      })),
      featuredImage: data.featuredImage || { url: "", alt: data.title },
      author: data.author || { name: "Admin" },
      status: data.status || "draft",
      isFeatured: Boolean(data.isFeatured),
      publishedAt: now,
      updatedAt: now,
      category: data.category || "electronics",
      tags: data.tags || []
    };
    const markdownContent = generateListMarkdown(frontmatter, data.content || "");
    const relativePath = generateListFilename(listId, lang);
    const absolutePath = path.join(process.cwd(), relativePath);
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(absolutePath, markdownContent, "utf-8");
    return new Response(
      JSON.stringify({
        success: true,
        listId,
        filePath: relativePath,
        message: "List created locally. Run git commit to save changes."
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Create List Error]", error);
    return new Response(
      JSON.stringify({ error: "Failed to create list: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const prerender = false;
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
