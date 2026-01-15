/**
 * API Endpoint: Individual Curated Deal
 * 
 * DELETE /api/admin/curated-deals/[id] - Delete a curated deal
 */

import type { APIRoute } from 'astro';
import { deleteCuratedDeal } from '@lib/db';

export const prerender = false;

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id || '');
    
    if (isNaN(id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await deleteCuratedDeal(id);

    return new Response(
      JSON.stringify({ success: true }),
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
