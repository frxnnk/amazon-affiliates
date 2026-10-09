import type { APIRoute } from 'astro';
import { generateListMarkdown, generateListFilename, parseMarkdownFrontmatter } from '@utils/markdown';
import { writeList, readList, deleteList, validContentId } from '@lib/persistent-content';

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const userId = locals.auth?.().userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const listId = params.id;
    if (!validContentId(listId)) {
      return new Response(
        JSON.stringify({ error: 'List ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.listType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, listType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lang = data.lang || 'es';
    if (!['es', 'en'].includes(lang)) return Response.json({ error: 'Invalid language' }, { status: 400 });
    const now = new Date().toISOString().split('T')[0];

    const existingMarkdown = await readList(listId, lang);
    const existing = existingMarkdown ? parseMarkdownFrontmatter<{ publishedAt?: string }>(existingMarkdown) : null;
    const publishedAt = existing?.frontmatter.publishedAt || now;

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
      publishedAt,
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
        message: 'List updated successfully.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Update List Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update list: ' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  const userId = locals.auth?.().userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const listId = params.id;
    if (!validContentId(listId)) {
      return new Response(
        JSON.stringify({ error: 'List ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const languages = await deleteList(listId);
    if (!languages.length) return Response.json({ error: 'List not found' }, { status: 404 });
    const deletedFiles = languages.map(lang => generateListFilename(listId, lang));

    return new Response(
      JSON.stringify({
        success: true,
        listId,
        deletedFiles,
        message: 'List deleted successfully.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Delete List Error]', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete list: ' + (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
