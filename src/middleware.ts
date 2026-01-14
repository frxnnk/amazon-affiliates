import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);
const isPublicAdminRoute = createRouteMatcher([
  '/admin/login',
  '/admin/signup',
  '/admin/sso-callback(.*)',
  '/admin/unauthorized',
]);

// Admin emails from environment
const getAdminEmails = (): string[] => {
  const emails = import.meta.env.ADMIN_EMAILS || '';
  return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
};

export const onRequest = clerkMiddleware(async (auth, context) => {
  const pathname = new URL(context.request.url).pathname;

  // Skip auth check for public admin routes
  if (isPublicAdminRoute(context.request)) {
    return;
  }

  // Protect admin routes
  if (isProtectedRoute(context.request)) {
    const { userId, sessionClaims } = auth();
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

    // Check if user email is in admin list
    const userEmail = (sessionClaims?.email as string)?.toLowerCase();
    const adminEmails = getAdminEmails();

    if (adminEmails.length > 0 && userEmail && !adminEmails.includes(userEmail)) {
      if (isApiRoute) {
        return new Response(JSON.stringify({ error: 'Forbidden: Not an admin' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return context.redirect('/admin/unauthorized');
    }
  }
});
