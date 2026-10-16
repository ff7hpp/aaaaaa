const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('serves the page and creates, completes, and deletes a task', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'academic-board-'));
  process.env.DATA_FILE = path.join(directory, 'tasks.json');
  const server = require('../server');
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://localhost:${server.address().port}`;

  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Academic Board/);

    const created = await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Lab report', course: 'CS101', dueDate: '2026-10-17' }),
    });
    assert.equal(created.status, 201);
    const task = await created.json();

    const updated = await fetch(`${base}/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    assert.equal((await updated.json()).done, true);
    assert.equal((await (await fetch(`${base}/api/tasks`)).json()).length, 1);

    const deleted = await fetch(`${base}/api/tasks/${task.id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
    assert.deepEqual(await (await fetch(`${base}/api/tasks`)).json(), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
