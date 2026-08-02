# Zaminex — Investment & Referral Platform

Monorepo for the Zaminex investment & referral platform built per `Blueprint.md`.

## Workspaces

| Workspace | Stack |
|-----------|-------|
| `server`  | Node.js · Express · MongoDB (Mongoose) · JWT · Zod · Winston · Swagger |
| `client`  | React (Vite) · TanStack Query · React Router · shadcn/ui · Tailwind · Framer Motion |
| `shared`  | Zod schemas + derived TypeScript types shared by client & server |

## Prerequisites

- Node.js >= 18
- A local MongoDB instance (or a `MONGO_URI` to a remote instance)

## Getting started

```bash
# 1. Install dependencies for all workspaces
npm install

# 2. Configure environment
cp .env.example .env
cp server/.env.example server/.env
#   then edit MONGO_URI / JWT secrets in server/.env

# 3. Seed an admin user + default settings
npm run seed

# 4. Run both client and server concurrently
npm run dev
```

- API:        http://localhost:5000/api/v1
- Swagger UI: http://localhost:5000/api/docs
- Client:     http://localhost:5173

## Scripts

| Command              | Description                                   |
|----------------------|-----------------------------------------------|
| `npm run dev`        | Run client + server concurrently (watch mode) |
| `npm run dev:server` | Server only (watch)                            |
| `npm run dev:client` | Client only (Vite)                             |
| `npm run build`      | Type-check + build shared, server, client      |
| `npm run typecheck`  | Type-check all workspaces                      |
| `npm run seed`       | Seed admin user + default settings             |
| `npm run start`      | Run built server                               |

## Architecture notes

- **Feature-based** structure within each workspace.
- **Single source of truth** for validation contracts: Zod schemas in `shared/`,
  consumed by the server `validate` middleware and reused on the client for forms.
- **Immutable financial ledger** + MongoDB transactions are introduced in later phases.
- **Theme engine** uses CSS variables only (light/dark), persisted per user.
- See `Blueprint.md` for the full 20-phase specification. Phase 1 (Foundation) is
  the scope of this initial implementation; subsequent phases layer on top.