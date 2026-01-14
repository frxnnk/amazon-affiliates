import { sequence } from 'astro:middleware';
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { clerkClient } from '@clerk/astro/server';

// Admin emails from environment
const getAdminEmails = (): string[] => {
  const emails = import.meta.env.ADMIN_EMAILS || '';
  return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
};

const isProtectedAdminRoute = createRouteMatcher([
  '/admin',
  '/admin/products(.*)',
  '/api/admin(.*)'
]);

// Use clerkMiddleware but let it handle auth state without blocking
export const onRequest = clerkMiddleware(async (auth, context, next) => {
  const pathname = new URL(context.request.url).pathname;

  // For admin routes that need protection
  if (isProtectedAdminRoute(context.request)) {
    const { userId } = auth();
    const isApiRoute = pathname.startsWith('/api/');

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
      return context.redirect('/admin/unauthorized');
    }
  }

  // Let everything else through
  return next();
}, { debug: false });
