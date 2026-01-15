/**
 * API Endpoint: Generate Product Content with GPT
 * 
 * POST /api/admin/generate-content
 * 
 * Generates product descriptions, pros/cons using GPT-4o-mini.
 */

import type { APIRoute } from 'astro';
import { generateProductContent, generateShortDescription } from '@lib/openai';

export const prerender = false;

interface GenerateContentRequest {
  productId: string;
  title?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  currentDescription?: string;
  lang: 'es' | 'en';
  type?: 'full' | 'short'; // 'full' generates all content, 'short' just description
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body: GenerateContentRequest = await request.json();
    
    if (!body.lang) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: lang' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { title, brand, category, imageUrl, currentDescription, lang, type = 'full' } = body;

    // Generate short description only
    if (type === 'short') {
      if (!title || !brand) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing required fields for short description: title and brand' 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await generateShortDescription(title, brand, lang);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          content: {
            shortDescription: result.description,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate full content
    const result = await generateProductContent({
      title,
      brand,
      category,
      imageUrl,
      currentDescription,
      lang,
    });
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: result.content,
        tokensUsed: result.tokensUsed,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate content error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
