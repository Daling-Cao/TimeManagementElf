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

The frontend can run as a desktop app whose entry point is a **desktop pet**: a transparent, frameless, always-on-top window showing an animated pixel-art cat that sits on the desktop. Clicking the cat toggles the main window (the existing task/pomodoro UI); the cat can be dragged to move it, and right-click opens a menu (`📅 规划今天`, `🔍 搜索任务`, `📋 任务列表`, `🍅 番茄钟`, `📊 统计` — each shows the main window on that route via `app:navigate` / `appAPI.onNavigate` — plus `主题`, `预览动作`, `退出`). There is no home page: `#/` redirects to `#/tasks`, and the main window starts hidden with its menu bar auto-hidden.

- Code lives in `frontend/electron/` (`main.cjs` = main process with the pet + main windows and IPC; `preload.cjs` = the `window.petAPI` bridge) and `frontend/src/pet/` (pet renderer). Entry HTML: `frontend/pet.html` (pet) and `frontend/index.html` (main app). `vite.config.ts` is multi-page (`main` + `pet`) with `base: './'`.
- Routing MUST stay on `HashRouter` (see `src/App.tsx`) and internal links MUST use `#/...`. `BrowserRouter`/`href="/..."` renders a blank window because Electron loads pages over `file://` (and `.../index.html`), where path-based routes never match.
- Scripts: `npm run electron:dev` (Vite dev server + Electron), `npm run electron:build` (build then run the built `dist/` over `file://`).

**Pixel-art states & how they're driven**

- Four states: `idle` (cat sleeping/loaf, default), `focus` (a cat-head, shown while a pomodoro timer runs), `celebrate` (waving a flag, shown briefly on completion), `play` (bouncing; triggers randomly during idle, never more often than ~30 min — `PLAY_MIN_GAP_MS` in `DesktopPet.tsx`).
- Sprites are hand-authored pixel frames in `frontend/src/pet/sprites.json` (palette + 16×16 frame grids), rendered on a `<canvas>` by `src/pet/PixelCat.tsx`; per-state motion is CSS in `src/pet/pet.css`. To edit the art, change `sprites.json` and preview without Electron via `node scripts/preview-sprites.mjs` (writes `sprite_*.png` strips to `/opt/cursor/artifacts`).
- The main window drives `focus`/`celebrate` from the pomodoro store: `src/App.tsx` calls `window.petAPI.setFocus(isRunning, currentTask?.title)` and `window.petAPI.celebrate()` (on `timeRemaining` hitting 0). While focusing, the pet shows a dark pill above the cat-head with the working task title. The main window uses `backgroundThrottling: false` so the timer stays accurate while hidden.
- Set env `PET_FAST=1` to shorten the playful cooldown (~12 s) for demos; the right-click `预览动作` submenu forces any state on demand.

**Auto-launch, daily planning & breaks**

- Auto-launch: `electron/main.cjs` registers a login item (`app.setLoginItemSettings`, arg `--autostart`) on every start, **packaged builds only** (dev would register the bare `electron.exe`). For the portable exe it uses `PORTABLE_EXECUTABLE_FILE`. Pet menu checkbox `开机自动启动` toggles it; the choice is stored in `userData/app-settings.json`. Closing the main window hides it; `before-quit` / Windows `session-end` set `app.isQuitting` so shutdown is not blocked.
- Daily planner (`src/components/DailyPlanner.tsx`, logic in `src/core/dailyPlan.ts`): pops up once per day (day starts at 04:00, `planDayKey`) on app start, and on `plan:check` sent by the main process on `powerMonitor` `resume` / `unlock-screen` and a 60 s tick (only when the user is active). It does not interrupt a running pomodoro. Today's order is `localStorage['dailyPlan']`; tasks stay in `localStorage['tasks']`. Opened manually via pet menu `📅 规划今天`. When it pops up while the main window is hidden, it shows on an opaque backdrop and hides the window again on close (unless a task was started).
- Breaks (`src/components/BreakOverlay.tsx`, `src/core/store/breakStore.ts`): choosing `任务已完成` in the pomodoro summary starts a 10-minute break (`BREAK_MINUTES`, timestamp-based). When it ends the main window is shown with the next unfinished task from today's plan.

**AI planning assistant (optional, bring-your-own API key)**

- `electron/ai.cjs` (main process) calls the model with the official SDKs: `openai` for the OpenAI-compatible Chat Completions format (OpenAI, DeepSeek, other compatible services via Base URL) and `@anthropic-ai/sdk` for the Claude Messages API. Config is in `userData/ai-config.json`; the API key is encrypted with `safeStorage` and never sent to the renderer. Renderer bridge: `window.aiAPI` (`getConfig` / `setConfig` / `complete`).
- Claude requests use `output_config` (`effort: 'medium'`, JSON-schema format) and, only against the official endpoint for models that support it, server-side `fallbacks: 'default'` (beta `server-side-fallback-2026-07-01`). OpenAI-format requests use `response_format: json_object` and retry without it on a 400.
- Renderer: presets + prompt + JSON parsing in `src/core/ai.ts`, settings UI `src/components/AiSettingsDialog.tsx`, and the “和小精灵商量” box inside `DailyPlanner`. Each request sends the current plan + backlog + the user's message; the reply replaces today's order (existing tasks reused by id, new ones created with `estimateMinutes`). Without a key the planner works as before.
- Task search (`src/core/taskSearch.ts`, UI `src/components/TaskSearchDialog.tsx`, global overlay in `App.tsx`): opened from pet menu `🔍 搜索任务` (`search:open` → `appAPI.onSearchOpen`; like the planner, the renderer checks `isMainVisible()` before `showMain()` and hides the window again on close if it was hidden). Scope is **all** tasks in `localStorage['tasks']` (incl. old completed ones the task list hides). With AI configured it sends titles/type/status/dates/duration, the AI summary overview and the latest 8 work notes per task (truncated, ~60k chars cap) and gets back `{results:[{task_id, reason}], answer}` (unknown ids dropped); without AI it falls back to local keyword matching. Clicking a hit opens `#/tasks?open=<id>`, which `SimpleTasksPage` turns into the task detail dialog. The web build (no pet) shows `📅 规划今天` / `🔍 搜索` links in the page nav instead.
- Task work summary (`src/components/TaskSummaryPanel.tsx`, in the task detail dialog of `SimpleTasksPage`): per-day time stats are computed locally from `task.summaries` (`computeTaskTimeStats`, never by the model); with AI configured, “生成总结” sends all work notes + the precomputed stats and stores the result on the task as `aiSummary` (overview / achievements / problems / nextSteps, plus `notesCount` to flag when newer notes exist).

**Swappable themes (GIF / image or built-in vector)**

- The pet animation is theme-driven so it can be replaced later. Registry: `frontend/src/pet/themes.json`; renderer switch: `src/pet/PetView.tsx` (`theme.kind === 'builtin'` → canvas `PixelCat`; `'image'` → one `<img>` per state that can be a GIF/APNG/animated WebP/PNG). Helpers/persistence in `src/pet/theme.ts` (selection saved in `localStorage['pet-theme']`).
- Image themes live under `frontend/public/themes/<id>/` with `idle|focus|celebrate|play.<ext>`. Adding a theme = drop those files + add an entry to `themes.json` + rebuild. See `frontend/public/themes/README.md`.
- Users switch via the right-click `主题` submenu (radio, remembers choice). The pet reports its theme list to the main process (`window.petAPI.reportThemes`) which builds the submenu and sends back `{ type: 'theme', id }`. A missing/broken asset falls back to the built-in theme (`PetView` `onImageError`).
- **User-uploaded (custom) themes:** pet menu `主题 → 🎨 自定义动画…` opens `#/pet-themes` (`src/pages/PetThemesPage.tsx`). A custom theme is based on a built-in theme; each of the 4 states can be uploaded/replaced/reset individually (GIF / APNG / WebP / PNG / JPG, ≤ 20 MB, format checked by magic bytes) and states without an upload use the base theme (`resolveStateSource` in `theme.ts`). Files live in `userData/pet-themes/<id>/` (`theme.json` + `<state>-<ts>.<ext>`), managed by `electron/pet-themes.cjs`, and are loaded through the privileged `elf-theme://themes/<id>/<file>` protocol. Bridge: `window.petThemesAPI`; changes send `{ type: 'themes-changed' }` to the pet, which reloads its list.
- The example `pixel-gif` theme's GIFs are generated from `sprites.json` via `npm run themes:gif` (uses `gifenc`, dev dep); `npm run themes:preview` renders sprite PNG strips. Generated assets are committed, so neither script runs at build/startup.
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
