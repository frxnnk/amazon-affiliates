/**
 * API Endpoint: Deal Agent Keywords Management
 * 
 * GET /api/admin/agent/keywords - List all keywords
 * POST /api/admin/agent/keywords - Add a keyword
 * DELETE /api/admin/agent/keywords?id=X - Delete a keyword
 * PATCH /api/admin/agent/keywords?id=X - Toggle keyword active status
 */

import type { APIRoute } from 'astro';
import { getDealAgentKeywords, addDealAgentKeyword, deleteDealAgentKeyword, toggleDealAgentKeyword } from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const keywords = await getDealAgentKeywords();
    return new Response(
      JSON.stringify({ success: true, keywords }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    if (!body.keyword || typeof body.keyword !== 'string' || body.keyword.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Keyword is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const keyword = await addDealAgentKeyword({
      keyword: body.keyword.trim(),
      category: body.category,
      marketplace: body.marketplace || 'com',
      isActive: body.isActive !== false,
    });

    return new Response(
      JSON.stringify({ success: true, keyword }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = parseInt(url.searchParams.get('id') || '');
    
    if (isNaN(id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid keyword ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await deleteDealAgentKeyword(id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ url }) => {
  try {
    const id = parseInt(url.searchParams.get('id') || '');
    
    if (isNaN(id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid keyword ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const keyword = await toggleDealAgentKeyword(id);

    return new Response(
      JSON.stringify({ success: true, keyword }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
