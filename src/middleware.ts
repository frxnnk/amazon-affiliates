import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { clerkClient } from '@clerk/astro/server';

// Admin emails from environment
const getAdminEmails = (): string[] => {
  const emails = import.meta.env.ADMIN_EMAILS || '';
  return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
};

// Rutas que requieren ser ADMIN
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)'
]);

// Rutas que requieren estar autenticado (usuario normal)
const isUserRoute = createRouteMatcher([
  '/:lang/dashboard(.*)',
  '/api/user(.*)'
]);

// Rutas publicas (login, callbacks)
const isPublicAuthRoute = createRouteMatcher([
  '/admin/login(.*)',
  '/admin/sso-callback(.*)',
  '/admin/unauthorized(.*)',
  '/:lang/login(.*)'
]);

export const onRequest = clerkMiddleware(async (auth, context) => {
  const { userId, redirectToSignIn } = auth();

  // Si es la pagina de login o unauthorized, permitir acceso
  if (isPublicAuthRoute(context.request)) {
    return;
  }

  // Si es ruta de admin
  if (isAdminRoute(context.request)) {
    // Si no esta autenticado, redirigir a login
    if (!userId) {
      return redirectToSignIn();
    }

    // Verificar si es admin
    try {
      const client = clerkClient(context);
      const user = await client.users.getUser(userId);
      const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() || '';
      const adminEmails = getAdminEmails();

      if (!adminEmails.includes(userEmail)) {
        // No es admin, redirigir a pagina de no autorizado
        return context.redirect('/admin/unauthorized');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      return context.redirect('/admin/unauthorized');
    }

    return;
  }

  // Si es ruta de usuario normal (dashboard, etc.)
  if (isUserRoute(context.request)) {
    if (!userId) {
      return redirectToSignIn();
    }
    return;
  }
});
