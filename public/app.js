const form = document.querySelector('#task-form');
const list = document.querySelector('#task-list');
const empty = document.querySelector('#empty');
const message = document.querySelector('#message');

async function api(url, options) {
  const response = await fetch(url, options);
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || 'Something went wrong');
  return body;
}

function showMessage(text) {
  message.textContent = text;
  message.hidden = !text;
}

function render(tasks) {
  const done = tasks.filter((task) => task.done).length;
  document.querySelector('#total').textContent = tasks.length;
  document.querySelector('#pending').textContent = tasks.length - done;
  document.querySelector('#completed').textContent = done;
  document.querySelector('#count-label').textContent = `${tasks.length} item${tasks.length === 1 ? '' : 's'}`;
  empty.hidden = tasks.length > 0;
  list.replaceChildren();

  for (const task of tasks.sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))) {
    const item = document.createElement('li');
    item.className = `task${task.done ? ' done' : ''}`;
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.setAttribute('aria-label', `Mark ${task.title} as ${task.done ? 'not done' : 'done'}`);
    check.addEventListener('change', () => updateTask(task.id, check.checked));
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = task.title;
    const detail = document.createElement('small');
    detail.textContent = [task.course, task.dueDate && `Due ${task.dueDate}`].filter(Boolean).join(' · ') || 'No course or due date';
    content.append(title, detail);
    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${task.title}`);
    remove.addEventListener('click', () => deleteTask(task.id));
    item.append(check, content, remove);
    list.append(item);
  }
}

async function refresh() {
  try {
    render(await api('/api/tasks'));
    showMessage('');
  } catch (error) {
    showMessage(error.message);
  }
}

async function updateTask(id, done) {
  try {
    await api(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) });
    await refresh();
  } catch (error) {
    showMessage(error.message);
    await refresh();
  }
}

async function deleteTask(id) {
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    await refresh();
  } catch (error) {
    showMessage(error.message);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  try {
    await api('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    form.reset();
    await refresh();
  } catch (error) {
    showMessage(error.message);
  }
});

refresh();
