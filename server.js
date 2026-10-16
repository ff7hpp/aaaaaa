const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const port = Number(process.env.PORT) || 3000;
const dataFile = process.env.DATA_FILE || path.join(__dirname, 'data', 'tasks.json');
const publicDir = path.join(__dirname, 'public');
const staticFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};

async function readTasks() {
  try {
    return JSON.parse(await fs.readFile(dataFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeTasks(tasks) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(tasks, null, 2) + '\n');
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) {
      const error = new Error('Request is too large');
      error.status = 413;
      throw error;
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/api/tasks' && request.method === 'GET') {
      return sendJson(response, 200, await readTasks());
    }
    if (url.pathname === '/api/tasks' && request.method === 'POST') {
      const input = await readJson(request);
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      const course = typeof input.course === 'string' ? input.course.trim() : '';
      const dueDate = typeof input.dueDate === 'string' ? input.dueDate : '';
      if (!title || title.length > 120 || course.length > 80 || (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))) {
        return sendJson(response, 400, { error: 'Enter a title (up to 120 characters), a course (up to 80), and a valid date.' });
      }
      const tasks = await readTasks();
      const task = { id: randomUUID(), title, course, dueDate, done: false };
      tasks.push(task);
      await writeTasks(tasks);
      return sendJson(response, 201, task);
    }
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([a-f0-9-]+)$/);
    if (taskMatch && ['PATCH', 'DELETE'].includes(request.method)) {
      const tasks = await readTasks();
      const index = tasks.findIndex((task) => task.id === taskMatch[1]);
      if (index < 0) return sendJson(response, 404, { error: 'Task not found' });
      if (request.method === 'DELETE') {
        tasks.splice(index, 1);
        await writeTasks(tasks);
        response.writeHead(204);
        return response.end();
      }
      const input = await readJson(request);
      if (typeof input.done !== 'boolean') return sendJson(response, 400, { error: 'done must be true or false' });
      tasks[index].done = input.done;
      await writeTasks(tasks);
      return sendJson(response, 200, tasks[index]);
    }
    if (request.method === 'GET' && Object.hasOwn(staticFiles, url.pathname)) {
      const [file, type] = staticFiles[url.pathname];
      const content = await fs.readFile(path.join(publicDir, file));
      response.writeHead(200, { 'Content-Type': type });
      return response.end(content);
    }
    return sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(response, error.status || 500, { error: error.status ? error.message : 'Server error' });
    if (!error.status) console.error(error);
  }
});

if (require.main === module) {
  server.listen(port, () => console.log(`Academic board: http://localhost:${port}`));
}

module.exports = server;
