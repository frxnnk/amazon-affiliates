import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

// Rutas protegidas (requieren autenticacion)
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
  '/:lang/dashboard(.*)',
  '/api/user(.*)'
]);

// Rutas publicas dentro del area de admin
const isPublicAdminRoute = createRouteMatcher([
  '/admin/login(.*)'
]);

export const onRequest = clerkMiddleware((auth, context) => {
  const { isAuthenticated, redirectToSignIn } = auth();

  // Si es la pagina de login, permitir acceso
  if (isPublicAdminRoute(context.request)) {
    return;
  }

  // Si es ruta protegida y no esta autenticado, redirigir a login
  if (isProtectedRoute(context.request) && !isAuthenticated) {
    return redirectToSignIn();
  }
});
