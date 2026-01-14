import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { clerkClient } from '@clerk/astro/server';

// Admin emails from environment
const getAdminEmails = (): string[] => {
  const emails = import.meta.env.ADMIN_EMAILS || '';
  return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
};

// Rutas publicas que NO requieren autenticacion
const isPublicRoute = createRouteMatcher([
  '/admin/login',
  '/admin/login/(.*)',
  '/admin/sso-callback(.*)',
  '/admin/unauthorized',
  '/:lang/login(.*)',
  '/:lang',
  '/:lang/(.*)',
  '/api/products(.*)',
  '/'
]);

// Rutas protegidas que requieren ser ADMIN
const isProtectedAdminRoute = createRouteMatcher([
  '/admin',
  '/admin/products(.*)',
  '/api/admin(.*)'
]);

// Rutas que requieren estar autenticado (usuario normal)
const isUserRoute = createRouteMatcher([
  '/:lang/dashboard(.*)',
  '/api/user(.*)'
]);

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Rutas completamente publicas - pasar directamente
  if (isPublicRoute(context.request)) {
    return next();
  }

  const { userId, redirectToSignIn } = auth();

  // Si es ruta de admin protegida
  if (isProtectedAdminRoute(context.request)) {
    const isApiRoute = pathname.includes('/api/');

    // Si no esta autenticado
    if (!userId) {
      if (isApiRoute) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return redirectToSignIn();
    }

    // Verificar si es admin
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
  }

  // Si es ruta de usuario normal (dashboard, etc.)
  if (isUserRoute(context.request)) {
    if (!userId) {
      return redirectToSignIn();
    }
    return next();
  }

  // Para cualquier otra ruta, continuar
  return next();
});
