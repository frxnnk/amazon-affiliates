import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);
const isPublicAdminRoute = createRouteMatcher([
  '/admin/login',
  '/admin/sso-callback(.*)',
  '/admin/unauthorized',
]);

// Satellite domain configuration for development
const clerkConfig = {
  signInUrl: 'https://select-cattle-15.accounts.dev/sign-in',
  isSatellite: true,
  domain: 'bestedeals.vercel.app',
};

export const onRequest = clerkMiddleware((auth, context) => {
  const pathname = new URL(context.request.url).pathname;

  // Skip auth check for public admin routes
  if (isPublicAdminRoute(context.request)) {
    return;
  }

  // Protect admin routes
  if (isProtectedRoute(context.request)) {
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
  }
}, clerkConfig);
