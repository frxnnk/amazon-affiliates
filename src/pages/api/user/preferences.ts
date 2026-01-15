/**
 * API Endpoint: User Preferences
 * 
 * GET /api/user/preferences - Get current user preferences
 * POST /api/user/preferences - Save user preferences
 * DELETE /api/user/preferences - Reset preferences
 */

import type { APIRoute } from 'astro';
import { getUserPreferences, saveUserPreferences, resetUserPreferences, type UserPreferencesInput } from '@lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const auth = locals.auth?.();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const preferences = await getUserPreferences(userId);

    return new Response(
      JSON.stringify({
        success: true,
        preferences: preferences || {
          budgetRange: null,
          categories: [],
          brands: [],
          dealSensitivity: 'medium',
          primeOnly: false,
          quizCompleted: false,
        },
      }),
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

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth?.();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: UserPreferencesInput = await request.json();

    // Validate budget range
    if (body.budgetRange && !['low', 'mid', 'high', 'premium'].includes(body.budgetRange)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid budget range' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate deal sensitivity
    if (body.dealSensitivity && !['low', 'medium', 'high'].includes(body.dealSensitivity)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid deal sensitivity' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const preferences = await saveUserPreferences(userId, body);

    return new Response(
      JSON.stringify({ success: true, preferences }),
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

export const DELETE: APIRoute = async ({ locals }) => {
  try {
    const auth = locals.auth?.();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const preferences = await resetUserPreferences(userId);

    return new Response(
      JSON.stringify({ success: true, preferences }),
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
