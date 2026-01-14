import { defineMiddleware, sequence } from 'astro:middleware';
import { clerkClient } from '@clerk/astro/server';

// Admin emails from environment
const getAdminEmails = (): string[] => {
  const emails = import.meta.env.ADMIN_EMAILS || '';
  return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
};

// Custom middleware for admin protection
const adminProtection = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Rutas publicas - no requieren autenticacion
  const publicPaths = [
    '/admin/login',
    '/admin/sso-callback',
    '/admin/unauthorized',
  ];

  // Check if it's a public path
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return next();
  }

  // Check if it's an admin route that needs protection
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!isAdminRoute) {
    return next();
  }

  // Get auth from Clerk (set by Clerk's integration)
  const auth = context.locals.auth?.();
  const userId = auth?.userId;
  const isApiRoute = pathname.startsWith('/api/');

  // If not authenticated
  if (!userId) {
    if (isApiRoute) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Redirect to login
    return context.redirect('/admin/login');
  }

  // Verify admin email
  try {
    const client = clerkClient(context);
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';
    const adminEmails = getAdminEmails();

    if (!adminEmails.includes(userEmail)) {
      if (isApiRoute) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/admin/unauthorized');
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    if (isApiRoute) {
      return new Response(JSON.stringify({ error: 'Error checking permissions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/admin/unauthorized');
  }

  return next();
});

export const onRequest = adminProtection;
