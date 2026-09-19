# MapleTasker

A lead-gen marketplace for household tasks.

- **Clients** post tasks for free.
- **Taskers** spend tokens to unlock a task's contact details.

This repo is **phase 1**: the project foundation (Next.js + Prisma + Postgres and a database-backed health check).

## Stack

| Layer    | Choice                              |
| -------- | ----------------------------------- |
| Framework| Next.js 16 (App Router) + TypeScript|
| Styling  | Tailwind CSS v4                     |
| Database | PostgreSQL                          |
| ORM      | Prisma 7 (`@prisma/adapter-pg`)     |

## Prerequisites

- **Node.js 20.19+** (this project was built on Node 26)
- **PostgreSQL 14+** running locally

## Getting started

### 1. Clone and install

```bash
git clone git@github.com:roshaneabeykoon/mapletasker.git
cd mapletasker
npm install
```

`npm install` runs `prisma generate` automatically, which writes the typed client to `src/generated/prisma` (gitignored).

### 2. Create the database

Make sure your local Postgres is running, then create the database:

```bash
createdb mapletasker_dev
```

If `createdb` / `psql` aren't on your `PATH` and you use **Postgres.app**, add its binaries first:

```bash
export PATH="/Applications/Postgres.app/Contents/Versions/18/bin:$PATH"
```

(Adjust `18` to your installed major version. Add that line to `~/.zshrc` to make it permanent.)

Alternatively, create it from any SQL client:

```sql
CREATE DATABASE mapletasker_dev;
```

### 3. Configure environment variables

Copy the example file and point it at your local Postgres:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mapletasker_dev?schema=public"
```

- `USER` is your Postgres role. With Postgres.app this is usually your macOS username, with **no password** — in that case drop the `:PASSWORD` part entirely, e.g.
  `postgresql://roshane@localhost:5432/mapletasker_dev?schema=public`
- `5432` is the default port; change it if your instance listens elsewhere.

`.env.local` is gitignored and must never be committed. `.env.example` is the committed template.

### 4. Run migrations

```bash
npm run db:migrate
```

This applies everything in `prisma/migrations` and creates the `Task`, `Tasker`, `Unlock`, and `WalletTransaction` tables.

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

### 6. Verify the database connection

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected",
  "counts": { "tasks": 0, "taskers": 0 },
  "timestamp": "..."
}
```

If the database is unreachable the route returns HTTP **503** with `"status": "error"` and the underlying message.

## Scripts

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start the dev server                                |
| `npm run build`       | Production build                                    |
| `npm run start`       | Serve the production build                          |
| `npm run lint`        | ESLint                                              |
| `npm run db:migrate`  | Create + apply a migration in development           |
| `npm run db:deploy`   | Apply existing migrations (CI / production)         |
| `npm run db:generate` | Regenerate the Prisma client                        |
| `npm run db:studio`   | Open Prisma Studio to browse data                   |

## Project structure

```
prisma/
  schema.prisma          Data model
  migrations/            Migration history
src/
  app/
    api/health/route.ts  DB-backed health check
    page.tsx             Placeholder landing page
  lib/prisma.ts          Prisma client singleton (pg driver adapter)
  generated/prisma/      Generated client (gitignored)
prisma7.config.ts        Prisma CLI config; loads .env.local
.env.example             Template for .env.local
```

## Notes on the Prisma 7 setup

- Prisma 7 requires a **driver adapter** for SQL databases; this project uses `@prisma/adapter-pg` over the `pg` driver.
- The generated client lives at `src/generated/prisma` (Prisma 7 requires an explicit output path) and is **not** committed — it's rebuilt on `npm install`.
- The Prisma CLI doesn't read `.env.local` on its own, so `prisma7.config.ts` loads it via `dotenv` to keep the CLI and the app on the same connection string.

## Data model

- **Task** — a client's posted job. `magicToken` is a unique token for passwordless access to their own task.
- **Tasker** — a registered tasker. Starts with a `tokenBalance` of 5.
- **Unlock** — records that a tasker paid to reveal a task. Unique on `(taskerId, taskId)` so a tasker is never charged twice for the same task.
- **WalletTransaction** — token ledger: `signup_grant`, `unlock_spend`, `stripe_topup`.
