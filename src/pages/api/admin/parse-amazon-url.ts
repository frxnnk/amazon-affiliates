import type { APIRoute } from 'astro';
import { getProductPrefillFromUrl, parseAmazonUrl, isValidAsin } from '@utils/amazon';

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.userId;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { url, asin, affiliateTag } = await request.json();

    // Si se proporciona un ASIN directo
    if (asin && isValidAsin(asin)) {
      const marketplace = 'es'; // default
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            asin: asin.toUpperCase(),
            marketplace,
            affiliateUrl: `https://www.amazon.${marketplace}/dp/${asin.toUpperCase()}${affiliateTag ? `?tag=${affiliateTag}` : ''}`,
            suggestedTitle: null,
            lang: 'es',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Si se proporciona una URL
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'Se requiere una URL de Amazon o un ASIN' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prefillData = getProductPrefillFromUrl(url, affiliateTag);

    if (!prefillData) {
      return new Response(
        JSON.stringify({
          error: 'No se pudo extraer información de la URL. Asegúrate de que sea una URL válida de Amazon con un producto.'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: prefillData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Parse Amazon URL Error]', error);
    return new Response(
      JSON.stringify({ error: 'Error al procesar la solicitud' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const prerender = false;
