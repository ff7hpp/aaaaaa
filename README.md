# Academic Board

A small frontend and backend for tracking coursework. Tasks are saved locally in `data/tasks.json`.

## Run

Requires Node.js 18 or newer. No package installation is needed.

```powershell
node server.js
```

Open http://localhost:3000 in your browser.

## Files

- `public/index.html` — frontend page
- `public/styles.css` — dashboard styling
- `public/app.js` — browser behavior
- `server.js` — HTTP server and task API
- `data/tasks.json` — local task data, created on first save and ignored by Git

## API

`GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, and `DELETE /api/tasks/:id`.
