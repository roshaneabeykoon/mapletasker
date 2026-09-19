# MapleTasker

A lead-gen marketplace for household tasks.

- **Clients** post tasks for free.
- **Taskers** spend tokens to unlock a task's contact details.

This repo is at **phase 2**: the client flow — posting a task and managing it through a magic link. No tasker features yet.

## Stack

| Layer    | Choice                              |
| -------- | ----------------------------------- |
| Framework| Next.js 16 (App Router) + TypeScript|
| Styling  | Tailwind CSS v4                     |
| Database | PostgreSQL                          |
| ORM      | Prisma 7 (`@prisma/adapter-pg`)     |
| Email    | Resend                              |

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

Email is configured with three more variables (see `.env.example` for the full comments):

| Variable         | Required | Purpose                                                                 |
| ---------------- | -------- | ----------------------------------------------------------------------- |
| `RESEND_API_KEY` | No       | Sends the magic-link email. Unset → email is skipped and logged instead. |
| `EMAIL_FROM`     | No       | Sender address. Defaults to Resend's shared `onboarding@resend.dev`.     |
| `APP_URL`        | No       | Base URL for links in emails. Defaults to `http://localhost:3000`.       |

Nothing here blocks local development: without `RESEND_API_KEY` the app still creates tasks and shows the magic link on the confirmation page. With the default sender, Resend will only deliver to your own account address or to its test inbox `delivered@resend.dev`.

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

## The client flow

Clients never sign in. Posting a task mints a **magic token** (32 random bytes, URL-safe base64), and possession of that token is the only authorization needed to manage the task.

| Page                | What it does                                                             |
| ------------------- | ------------------------------------------------------------------------ |
| `/post-task`        | The posting form. Submits to `POST /api/tasks`.                           |
| `/post-task/confirmation` | Shows the magic link with a copy button, in case the email is slow. |
| `/manage/[token]`   | Loads the task, edits it, or deletes it behind a confirmation step.       |

| Endpoint                          | Behaviour                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `POST /api/tasks`                 | Validates input, creates the task with `status: "open"`, emails the link. `201` with the task (including `magicToken`) and `emailSent`. Invalid input → `422` with per-field errors. |
| `GET /api/tasks/manage/[token]`   | The matching task, or `404`.                                                   |
| `PATCH /api/tasks/manage/[token]` | Updates `name`, `category`, `urgency`, `location`, `budget`, `description`. `404` if the token doesn't match, `422` if nothing valid was sent. |
| `DELETE /api/tasks/manage/[token]`| **Soft** delete: sets `deletedAt` and `status: "cancelled"`. The row stays so unlock history remains auditable. |

Soft-deleted tasks are invisible to every route, so the magic link stops working after deletion.

`email` is deliberately **not** editable — it's the address the magic link was sent to. A failed email never fails the request: the task is already created and the link is shown in the UI and logged.

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
    api/health/route.ts                  DB-backed health check
    api/tasks/route.ts                   POST: create a task + email the magic link
    api/tasks/manage/[token]/route.ts    GET / PATCH / DELETE by magic token
    post-task/                           Posting form + confirmation page
    manage/[token]/                      Edit / delete a task via magic link
    page.tsx                             Landing page
  components/
    TaskForm.tsx                         Shared form for creating and editing
    MagicLinkPanel.tsx                   Magic link display + copy button
  lib/
    prisma.ts                            Prisma client singleton (pg driver adapter)
    tasks.ts                             Field constants, validation, token generation
    email.ts                             Resend client + magic-link email
  generated/prisma/                      Generated client (gitignored)
prisma7.config.ts        Prisma CLI config; loads .env.local
.env.example             Template for .env.local
```

## Notes on the Prisma 7 setup

- Prisma 7 requires a **driver adapter** for SQL databases; this project uses `@prisma/adapter-pg` over the `pg` driver.
- The generated client lives at `src/generated/prisma` (Prisma 7 requires an explicit output path) and is **not** committed — it's rebuilt on `npm install`.
- The Prisma CLI doesn't read `.env.local` on its own, so `prisma7.config.ts` loads it via `dotenv` to keep the CLI and the app on the same connection string.

## Data model

- **Task** — a client's posted job. `magicToken` is a unique token for passwordless access to their own task. `deletedAt` marks a soft delete; `status` is one of `open`, `claimed`, `done`, `cancelled`.
- **Tasker** — a registered tasker. Starts with a `tokenBalance` of 5.
- **Unlock** — records that a tasker paid to reveal a task. Unique on `(taskerId, taskId)` so a tasker is never charged twice for the same task.
- **WalletTransaction** — token ledger: `signup_grant`, `unlock_spend`, `stripe_topup`.
