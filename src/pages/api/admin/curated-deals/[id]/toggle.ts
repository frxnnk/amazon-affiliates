/**
 * API Endpoint: Toggle Curated Deal Status
 * 
 * POST /api/admin/curated-deals/[id]/toggle - Toggle active/inactive status
 */

import type { APIRoute } from 'astro';
import { toggleCuratedDeal } from '@lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id || '');
    
    if (isNaN(id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const deal = await toggleCuratedDeal(id);

    return new Response(
      JSON.stringify({ success: true, deal }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
