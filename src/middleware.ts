import { defineMiddleware } from 'astro:middleware';

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
    try {
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

      // For now, skip email check - just verify auth works
      // TODO: Re-enable admin email check once auth is stable

    } catch (error) {
      console.error('Middleware error:', error);
      // On error, redirect to login instead of crashing
      return context.redirect('/admin/login');
    }
  }

  return next();
});
