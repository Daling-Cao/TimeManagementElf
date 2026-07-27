# AGENTS.md

## Cursor Cloud specific instructions

This is a monorepo for **时间管理小精灵 (TimeManagementElf)**, a Pomodoro + task-management web app.

### Services

| Service    | Path       | Dev command                          | URL                              |
| ---------- | ---------- | ------------------------------------ | -------------------------------- |
| Backend    | `backend/` | `npm run start:dev` (NestJS, watch)  | http://localhost:3000/api        |
| Frontend   | `frontend/`| `npm run dev` (Vite)                 | http://localhost:5173            |

Health check: `curl http://localhost:3000/api/health`. The frontend is the primary UI; the backend is a separate JWT/REST API (register via `POST /api/auth/register`, then `POST /api/auth/login`). The current frontend UI persists tasks/timer state in `localStorage` and does not yet require the backend to be running.

### Database (SQLite + Prisma) — important gotcha

- The DB is SQLite committed at `backend/prisma/dev.db`; the schema is already migrated, so no DB setup is needed at runtime.
- `backend/prisma.config.ts` requires the `DATABASE_URL` env var for **Prisma CLI** commands (`prisma generate`, `prisma migrate`), even though `schema.prisma` hardcodes `url = "file:./dev.db"`. Run CLI commands from `backend/` with `DATABASE_URL="file:./dev.db"` set, e.g. `DATABASE_URL="file:./dev.db" npx prisma generate`.
- The NestJS runtime does **not** need `DATABASE_URL` (the generated client uses the hardcoded url in `schema.prisma`), so `npm run start:dev` works without any env vars.

### Lint / test / build caveats (all pre-existing, not env issues)

- Backend `npm run lint` runs `eslint --fix`, which **auto-modifies source files**. Use `git checkout` to discard those edits if you only wanted to check lint.
- Frontend `npm run lint` is read-only and reports many pre-existing errors.
- Backend `npm test` (jest): the `*.spec.ts` files are default scaffolds that fail because they don't provide `PrismaService` in their `TestingModule`. Jest itself runs fine.
- Frontend `npm run build` (`tsc -b && vite build`) fails on pre-existing TypeScript errors in legacy/unused files (`src/pages/HomePage.tsx`, `TasksPage.tsx`, `TomatoPage.tsx`, and some `src/core/*`). `App.tsx` renders the `Simple*` pages instead, so `npm run dev` (Vite, no type-check) runs cleanly. Prefer the dev server for development.
