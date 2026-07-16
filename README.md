# Life Admin Autopilot

Life Admin Autopilot is a local, single-user application for tracking subscriptions, bills, warranties, and appointments. It will extract structured information from documents or pasted email text and surface upcoming deadlines.

## Current milestone

Milestone 1 is complete: the monorepo foundation, React/Vite/Tailwind frontend, Express/TypeScript backend, SQLite Prisma schema, and uploads directory are in place. Product features and API routes are deliberately deferred to later milestones.

## Repository layout

```
frontend/       React + TypeScript + Vite + Tailwind CSS
backend/        Express + TypeScript API
prisma/         SQLite schema and future seed data
uploads/        Local document storage (ignored except for .gitkeep)
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer

## Setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

The frontend runs at `http://localhost:5173`; the backend health check is available at `http://localhost:3001/health`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite database URL, e.g. `file:./dev.db` |
| `OPENAI_API_KEY` | OpenAI API key; required when extraction is implemented |
| `OPENAI_MODEL` | Configurable model name; never hardcoded in application logic |
| `AI_PROVIDER` | AI provider selector, initially `openai` |
| `PORT` | Backend port, defaults to `3001` |

## Prisma commands

```bash
npx prisma migrate dev --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npx prisma db seed --schema prisma/schema.prisma
```

The schema uses strings for its constrained `type`, `status`, and `sourceType` values because Prisma's SQLite connector does not support database enums. Later application code will validate the permitted values.
