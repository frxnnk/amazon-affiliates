import { defineMiddleware } from 'astro:middleware';
import { clerkClient } from '@clerk/astro/server';

// Admin emails from environment
const getAdminEmails = (): string[] => {
  const emails = import.meta.env.ADMIN_EMAILS || '';
  return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
};

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = new URL(context.request.url).pathname;

  // Public routes - no auth needed
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/sso-callback') ||
    pathname === '/admin/unauthorized' ||
    !pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')
  ) {
    return next();
  }

  // Protected admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const auth = context.locals.auth?.();
    const userId = auth?.userId;
    const isApiRoute = pathname.startsWith('/api/');

    // Not authenticated
    if (!userId) {
      if (isApiRoute) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/admin/login');
    }

    // Check admin email
    try {
      const client = clerkClient(context);
      const user = await client.users.getUser(userId);
      const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';
      const adminEmails = getAdminEmails();

      if (!adminEmails.includes(userEmail)) {
        if (isApiRoute) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return context.redirect('/admin/unauthorized');
      }
    } catch (error) {
      console.error('Admin check error:', error);
      if (isApiRoute) {
        return new Response(JSON.stringify({ error: 'Auth error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/admin/unauthorized');
    }
  }

  return next();
});
