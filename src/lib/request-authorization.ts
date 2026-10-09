import { timingSafeEqual } from 'node:crypto';

interface Session {
  userId?: string | null;
  sessionClaims?: unknown;
}

export function validCronSecret(request: Request, secret: string): boolean {
  if (!secret) return false;
  const authorization = request.headers.get('authorization');
  const supplied = request.headers.get('x-cron-secret') || (authorization?.startsWith('Bearer ') ? authorization.slice(7) : null);
  if (!supplied) return false;
  const actual = Buffer.from(supplied);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** One boundary for administrative APIs, diagnostics and scheduled work. */
export function authorizeRequest(request: Request, session: Session, secret: string): Response | undefined {
  let pathname: string;
  try { pathname = decodeURIComponent(new URL(request.url).pathname); }
  catch { return new Response(null, { status: 400 }); }
  if (/^\/admin\/(?:login(?:\/sso-callback)?|sso-callback|unauthorized)\/?$/.test(pathname)) return;
  if (!/^\/(?:admin|api\/(?:admin|debug|cron))(?:\/|$)/.test(pathname)) return;
  if (pathname.startsWith('/api/cron/') && validCronSecret(request, secret)) return;
  const claims = session.sessionClaims as { metadata?: { role?: unknown } } | null | undefined;
  if (session.userId && claims?.metadata?.role === 'admin') return;
  if (pathname.startsWith('/api/')) {
    return Response.json({ error: session.userId ? 'Forbidden: Not an admin' : 'Unauthorized' }, {
      status: session.userId ? 403 : 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  return new Response(null, { status: 302, headers: { Location: session.userId ? '/admin/unauthorized' : '/admin/login' } });
}
