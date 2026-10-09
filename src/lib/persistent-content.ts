import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export function validContentId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id);
}

function listPath(id: string, lang: string, dataDir = process.env.DATA_DIR): string {
  if (!validContentId(id) || !['es', 'en'].includes(lang)) throw new Error('Invalid list id or language');
  const root = dataDir ? join(resolve(dataDir), 'content', 'lists') : join(process.cwd(), 'src', 'content', 'lists');
  return join(root, lang, `${id}.md`);
}

function modelPath(id: string, dataDir = process.env.DATA_DIR): string {
  if (!validContentId(id)) throw new Error('Invalid model id');
  const root = dataDir ? join(resolve(dataDir), 'models') : join(process.cwd(), 'public', 'models');
  return join(root, `${id}.glb`);
}

async function readOptional(path: string): Promise<Buffer | null> {
  try { return await readFile(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

async function writeAtomic(path: string, value: string | Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, value, { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

export async function writeList(id: string, lang: string, markdown: string, dataDir?: string): Promise<void> {
  await writeAtomic(listPath(id, lang, dataDir), markdown);
}

export async function readList(id: string, lang: string, dataDir?: string): Promise<string | null> {
  return (await readOptional(listPath(id, lang, dataDir)))?.toString('utf8') ?? null;
}

export async function deleteList(id: string, dataDir?: string): Promise<string[]> {
  const removed: string[] = [];
  for (const lang of ['es', 'en']) {
    try { await unlink(listPath(id, lang, dataDir)); removed.push(lang); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return removed;
}

export async function writeModel(id: string, model: Buffer, dataDir?: string): Promise<string> {
  await writeAtomic(modelPath(id, dataDir), model);
  return `/models/${id}.glb`;
}

export async function readModel(id: string, dataDir?: string): Promise<Buffer | null> {
  return readOptional(modelPath(id, dataDir));
}
