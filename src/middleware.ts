import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);
const isPublicAdminRoute = createRouteMatcher([
  '/admin/login',
  '/admin/signup',
  '/admin/sso-callback(.*)',
  '/admin/unauthorized',
]);

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

    // Check if user has admin role in Clerk metadata
    const userRole = (sessionClaims?.metadata as { role?: string })?.role;

    if (userRole !== 'admin') {
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
