import { g as generateListMarkdown, a as generateListFilename } from "../../../../chunks/markdown_DdU4YeJ3.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { g as getCollection } from "../../../../chunks/_astro_content_DsUv7PQc.mjs";
import { renderers } from "../../../../renderers.mjs";
const PUT = async ({ request, locals, params }) => {
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const listId = params.id;
    if (!listId) {
      return new Response(
        JSON.stringify({ error: "List ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const data = await request.json();
    if (!data.title || !data.listType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, listType" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const lang = data.lang || "es";
    const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let publishedAt = now;
    try {
      const lists = await getCollection("lists");
      const existing = lists.find((l) => l.data.listId === listId && l.data.lang === lang);
      if (existing) {
        publishedAt = existing.data.publishedAt || now;
      }
    } catch {
    }
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
      publishedAt,
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
        message: "List updated successfully."
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Update List Error]", error);
    return new Response(
      JSON.stringify({ error: "Failed to update list: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const DELETE = async ({ locals, params }) => {
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const listId = params.id;
    if (!listId) {
      return new Response(
        JSON.stringify({ error: "List ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const lists = await getCollection("lists");
    const listFiles = lists.filter((l) => l.data.listId === listId);
    if (listFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "List not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const deletedFiles = [];
    for (const list of listFiles) {
      const relativePath = generateListFilename(listId, list.data.lang);
      const absolutePath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        deletedFiles.push(relativePath);
      }
    }
    return new Response(
      JSON.stringify({
        success: true,
        listId,
        deletedFiles,
        message: "List deleted successfully."
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Delete List Error]", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete list: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
const prerender = false;
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DELETE,
  PUT,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
