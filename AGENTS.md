# AGENTS.md

## Cursor Cloud specific instructions

This is a monorepo for **时间管理小精灵 (TimeManagementElf)**, a Pomodoro + task-management web app.

### Services

| Service    | Path       | Dev command                          | URL                              |
| ---------- | ---------- | ------------------------------------ | -------------------------------- |
| Backend    | `backend/` | `npm run start:dev` (NestJS, watch)  | http://localhost:3000/api        |
| Frontend   | `frontend/`| `npm run dev` (Vite)                 | http://localhost:5173            |
| Desktop    | `frontend/`| `npm run electron:dev` (Electron)    | desktop windows (needs a display)|

Health check: `curl http://localhost:3000/api/health`. The frontend is the primary UI; the backend is a separate JWT/REST API (register via `POST /api/auth/register`, then `POST /api/auth/login`). The frontend UI persists tasks/timer state in `localStorage` and does not require the backend to be running.

### Desktop app (Electron "desktop pet")

The frontend can run as a desktop app whose entry point is a **desktop pet**: a transparent, frameless, always-on-top window showing an animated pixel-art cat that sits on the desktop. Clicking the cat toggles the main window (the existing task/pomodoro UI); the cat can be dragged to move it, and right-click opens a menu (`打开/隐藏主界面`, `预览动作` submenu, `退出`).

- Code lives in `frontend/electron/` (`main.cjs` = main process with the pet + main windows and IPC; `preload.cjs` = the `window.petAPI` bridge) and `frontend/src/pet/` (pet renderer). Entry HTML: `frontend/pet.html` (pet) and `frontend/index.html` (main app). `vite.config.ts` is multi-page (`main` + `pet`) with `base: './'`.
- Routing MUST stay on `HashRouter` (see `src/App.tsx`) and internal links MUST use `#/...`. `BrowserRouter`/`href="/..."` renders a blank window because Electron loads pages over `file://` (and `.../index.html`), where path-based routes never match.
- Scripts: `npm run electron:dev` (Vite dev server + Electron), `npm run electron:build` (build then run the built `dist/` over `file://`).

**Pixel-art states & how they're driven**

- Four states: `idle` (cat sleeping/loaf, default), `focus` (a cat-head, shown while a pomodoro timer runs), `celebrate` (waving a flag, shown briefly on completion), `play` (bouncing; triggers randomly during idle, never more often than ~30 min — `PLAY_MIN_GAP_MS` in `DesktopPet.tsx`).
- Sprites are hand-authored pixel frames in `frontend/src/pet/sprites.json` (palette + 16×16 frame grids), rendered on a `<canvas>` by `src/pet/PixelCat.tsx`; per-state motion is CSS in `src/pet/pet.css`. To edit the art, change `sprites.json` and preview without Electron via `node scripts/preview-sprites.mjs` (writes `sprite_*.png` strips to `/opt/cursor/artifacts`).
- The main window drives `focus`/`celebrate` from the pomodoro store: `src/App.tsx` calls `window.petAPI.setFocus(isRunning, currentTask?.title)` and `window.petAPI.celebrate()` (on `timeRemaining` hitting 0). While focusing, the pet shows a dark pill above the cat-head with the working task title. The main window uses `backgroundThrottling: false` so the timer stays accurate while hidden.
- Set env `PET_FAST=1` to shorten the playful cooldown (~12 s) for demos; the right-click `预览动作` submenu forces any state on demand.
- **Cloud VM run notes:** a display is available at `DISPLAY=:1`. Electron needs the sandbox disabled in this container — pass `--no-sandbox` (e.g. `DISPLAY=:1 PET_FAST=1 ./node_modules/.bin/electron . --no-sandbox` after `npm run build`) or set `ELECTRON_DISABLE_SANDBOX=1`. The Electron binary is downloaded lazily on the **first** `electron` invocation (not during `npm install`), so the first run prints "Downloading Electron binary..." and takes longer. `dbus`-connection errors in the log are harmless. Dragging the transparent pet window can leave visual trails on this VM (no compositor); that artifact does not occur on real Windows/macOS.

### Database (SQLite + Prisma) — important gotcha

- The DB is SQLite committed at `backend/prisma/dev.db`; the schema is already migrated, so no DB setup is needed at runtime.
- `backend/prisma.config.ts` requires the `DATABASE_URL` env var for **Prisma CLI** commands (`prisma generate`, `prisma migrate`), even though `schema.prisma` hardcodes `url = "file:./dev.db"`. Run CLI commands from `backend/` with `DATABASE_URL="file:./dev.db"` set, e.g. `DATABASE_URL="file:./dev.db" npx prisma generate`.
- The NestJS runtime does **not** need `DATABASE_URL` (the generated client uses the hardcoded url in `schema.prisma`), so `npm run start:dev` works without any env vars.

### Lint / test / build caveats

- Backend `npm run lint` runs `eslint --fix`, which **auto-modifies source files** (mostly prettier formatting). Use `git checkout` to discard those edits if you only wanted to check lint.
- Frontend `npm run lint` is read-only. It is currently clean (0 errors); the only intentionally-suppressed items are a few `react-hooks/exhaustive-deps` on run-once effects (annotated with `eslint-disable` comments).
- Backend `npm test` (jest) passes (8/8). `App.tsx` renders the `Simple*` pages; the non-`Simple*` pages/components (`HomePage.tsx`, `TasksPage.tsx`, `TomatoPage.tsx`, `TaskList`/`TaskItem`/etc.) are legacy/unused but still type-checked by `tsc -b`.
- Frontend `npm run build` (`tsc -b && vite build`) passes and emits both `index.html` and `pet.html`.
