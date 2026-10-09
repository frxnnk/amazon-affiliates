import type { APIRoute } from 'astro';
import { generateListMarkdown, generateListFilename, slugify } from '@utils/markdown';
import { writeList, validContentId } from '@lib/persistent-content';

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.().userId;
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
    if (!validContentId(listId) || !['es', 'en'].includes(lang)) return Response.json({ error: 'Invalid list id or language' }, { status: 400 });
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

    await writeList(listId, lang, markdownContent);

    return new Response(
      JSON.stringify({
        success: true,
        listId,
        filePath: relativePath,
        message: 'List saved successfully.',
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
