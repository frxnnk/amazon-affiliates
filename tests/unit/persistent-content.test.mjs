import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeList, readList, deleteList, writeModel, readModel, validContentId } from '../../src/lib/persistent-content.ts';

test('list create/update/read/delete survives a new process data directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'openship-content-'));
  try {
    await writeList('summer-deals', 'es', 'first', dir);
    assert.equal(await readList('summer-deals', 'es', dir), 'first');
    await writeList('summer-deals', 'es', 'updated', dir);
    assert.equal(await readFile(join(dir, 'content/lists/es/summer-deals.md'), 'utf8'), 'updated');
    assert.deepEqual(await deleteList('summer-deals', dir), ['es']);
    assert.equal(await readList('summer-deals', 'es', dir), null);
    assert.deepEqual(await deleteList('summer-deals', dir), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('models are served from the same persistent storage that receives writes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'openship-model-'));
  try {
    const model = Buffer.from('glTF-test');
    assert.equal(await writeModel('product-1', model, dir), '/models/product-1.glb');
    assert.deepEqual(await readModel('product-1', dir), model);
    assert.equal(await readModel('missing', dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('user ids and locales cannot escape storage paths', async () => {
  for (const id of ['../escape', '..', 'a/b', 'a\\b', '', '%2e%2e', 'bad\0name']) {
    assert.equal(validContentId(id), false);
    await assert.rejects(() => writeList(id, 'es', 'bad'));
    await assert.rejects(() => readModel(id));
  }
  await assert.rejects(() => writeList('valid', '../en', 'bad'));
});
