import type { APIRoute } from 'astro';
import { readModel, validContentId } from '@lib/persistent-content';

export const prerender = false;
export const GET: APIRoute = async ({ params }) => {
  if (!validContentId(params.id)) return new Response('Not found', { status: 404 });
  const model = await readModel(params.id);
  if (!model) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(model), { headers: {
    'Content-Type': 'model/gltf-binary',
    'Content-Length': String(model.length),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=60',
  } });
};
