import type { APIRoute } from 'astro';
import { generateListMarkdown, generateListFilename, slugify } from '@utils/markdown';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.listType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, listType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const listId = data.listId || slugify(data.title);
    const lang = data.lang || 'es';
    const now = new Date().toISOString().split('T')[0];

    const frontmatter = {
      listId,
      lang,
      title: data.title,
      subtitle: data.subtitle || undefined,
      excerpt: data.excerpt || '',
      listType: data.listType,
      visibility: data.visibility || 'public',
      products: (data.products || []).map((p: any, index: number) => ({
        productId: p.productId,
        position: p.position || index + 1,
        badge: p.badge || undefined,
        miniReview: p.miniReview || undefined,
      })),
      featuredImage: data.featuredImage || { url: '', alt: data.title },
      author: data.author || { name: 'Admin' },
      status: data.status || 'draft',
      isFeatured: Boolean(data.isFeatured),
      publishedAt: now,
      updatedAt: now,
      category: data.category || 'electronics',
      tags: data.tags || [],
    };

    const markdownContent = generateListMarkdown(frontmatter as any, data.content || '');
    const relativePath = generateListFilename(listId, lang);

    // Write file locally (for development)
    const absolutePath = path.join(process.cwd(), relativePath);
    const dir = path.dirname(absolutePath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, markdownContent, 'utf-8');

    return new Response(
      JSON.stringify({
        success: true,
        listId,
        filePath: relativePath,
        message: 'List created locally. Run git commit to save changes.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Create List Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create list: ' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
