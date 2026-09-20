# MapleTasker

A lead-gen marketplace for household tasks.

- **Clients** post tasks for free.
- **Taskers** spend tokens to unlock a task's contact details.

This repo is at **phase 3**: the client flow (post a task, manage it by magic link) plus tasker accounts and the open-task feed. Unlocking leads is phase 4.

## Stack

| Layer    | Choice                              |
| -------- | ----------------------------------- |
| Framework| Next.js 16 (App Router) + TypeScript|
| Styling  | Tailwind CSS v4                     |
| Database | PostgreSQL                          |
| ORM      | Prisma 7 (`@prisma/adapter-pg`)     |
| Email    | Resend                              |
| Auth     | bcrypt hashes + `jose` JWT session cookie |

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
| `SESSION_SECRET` | **Yes**  | Signs the tasker session cookie. Generate with `openssl rand -base64 32`. The app throws on boot without it. |
| `RESEND_API_KEY` | No       | Sends the magic-link email. Unset → email is skipped and logged instead. |
| `EMAIL_FROM`     | No       | Sender address. Defaults to Resend's shared `onboarding@resend.dev`.     |
| `APP_URL`        | No       | Base URL for links in emails. Defaults to `http://localhost:3000`.       |

`SESSION_SECRET` is the one hard requirement — generate it before starting the app:

```bash
openssl rand -base64 32
```

Without `RESEND_API_KEY` the app still creates tasks and shows the magic link on the confirmation page. With the default sender, Resend will only deliver to your own account address or to its test inbox `delivered@resend.dev`.

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
| `PATCH /api/tasks/manage/[token]` | Updates `name`, `phone`, `category`, `urgency`, `location`, `budget`, `description`. Send `"phone": null` to clear it. `404` if the token doesn't match, `422` if nothing valid was sent. |
| `DELETE /api/tasks/manage/[token]`| **Soft** delete: sets `deletedAt` and `status: "cancelled"`. The row stays so unlock history remains auditable. |

Soft-deleted tasks are invisible to every route, so the magic link stops working after deletion.

`phone` and `description` are the only optional fields; everything else is required by both the form and the API. A submitted phone number is stored exactly as typed (formatting is a display concern) and only needs to contain 10–15 digits.

`email` is deliberately **not** editable — it's the address the magic link was sent to. A failed email never fails the request: the task is already created and the link is shown in the UI and logged.

## The tasker flow

Taskers do have accounts: email + bcrypt-hashed password (cost 12), with a stateless session in an `HttpOnly` cookie holding a `jose`-signed JWT (HS256, 7-day expiry, `SameSite=Lax`, `Secure` in production only so local http still works).

| Page                    | What it does                                                        |
| ----------------------- | -------------------------------------------------------------------- |
| `/signup`               | Creates the account with a **0** token balance and logs you in.      |
| `/login`                | Email + password. Honours `?next=` to return you where you started.  |
| `/tasks`                | Logged-in-only feed of open tasks. Shows a banner with a resend button until the email is verified. |
| `/verify-email/[token]` | Redeems a verification link, grants tokens, and logs the tasker in on whatever device clicked it. |

| Endpoint                             | Behaviour                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `POST /api/auth/signup`               | `201` + session cookie. Creates the `Tasker` with `tokenBalance: 0` and emails a verification link. `409` on duplicate email, `422` on weak input. |
| `POST /api/auth/login`                | `200` + session cookie, or `401`. Every failure returns the identical message. |
| `POST /api/auth/logout`               | Clears the cookie.                                                            |
| `GET /api/auth/verify-email/[token]`  | Grants `SIGNUP_GRANT` tokens and marks the account verified, once. `404` if invalid/reused, `410` if expired. Public — the link may be opened on a different device than the one that signed up. |
| `POST /api/auth/verify-email/resend`  | Requires a session. Invalidates old links and sends a new one. Rate limited; a no-op returning `{ alreadyVerified: true }` if already verified. |
| `GET /api/tasks`                      | Open, non-deleted tasks for signed-in taskers only (`401` otherwise).          |

### Email verification

Signup no longer grants tokens directly. `Tasker.tokenBalance` starts at **0**, and `SIGNUP_GRANT` (3, in `src/lib/auth.ts`) is credited — along with a `signup_grant` ledger row — only when the tasker redeems the one-time link emailed to them. This closes a farming hole: without it, creating throwaway accounts is a free way to harvest unlocks.

- **Tokens live in `EmailVerificationToken`**, not on the `Tasker` row. `createVerificationToken` deletes any existing token for that tasker before creating a new one, so requesting a resend invalidates the earlier link.
- **Redemption is race-safe.** `verifyEmailToken` reads the token, then deletes it by id inside the same transaction and checks the delete actually removed a row before granting anything. Two simultaneous requests with the same token (double-click, retried request) can't both succeed — only one wins the delete. Verified directly: reusing a spent token returns `404` and the balance is unchanged.
- **Re-verifying a verified account is a no-op**, not a second grant — checked inside the same transaction as the delete.
- **Accounts created before this feature** keep whatever balance the old signup logic already gave them; nothing retroactively re-verifies or deducts.

### Rate limiting

`src/lib/rate-limit.ts` throttles the three endpoints that are cheap to abuse, counting attempts as rows in `RateLimitHit`:

| Endpoint | Limit |
| -------- | ----- |
| `POST /api/auth/login`  | 5 **failures** per email / 15 min, and 20 per IP / 15 min |
| `POST /api/auth/signup` | 5 per IP / hour |
| `POST /api/tasks`       | 10 per IP / hour, and 3 per recipient email / hour |

Over the limit returns `429` with a `Retry-After` header and a human-readable message.

Design notes worth preserving:

- **Login counts only failures**, and a successful login clears that account's counter — but *not* the IP counter, or an attacker could reset their IP budget by logging into an account they own between bursts of guessing.
- **Both email and IP are limited.** Per-email alone is beaten by rotating IPs; per-IP alone lets one office behind a NAT lock each other out.
- **The check runs before the bcrypt compare**, so blocked guesses cost no CPU.
- **Task posting is limited per recipient email** because that route sends mail to whatever address it's handed — uncapped, it's a way to spam a stranger's inbox.
- **It fails open.** If the database is unreachable the limiter logs and allows the request; it must not be the thing that takes login down, and the routes it guards can't work without the database anyway.
- Postgres was chosen over Redis deliberately: no extra service, it survives deploys, and it works across multiple instances. Revisit if check latency ever matters.

Old rows are pruned opportunistically (5% of writes drop anything over 24h old), so no cron job is needed at this scale.

### How authorization is layered

1. **`src/proxy.ts`** (Next 16's renamed `middleware`) does *optimistic* redirects — it only reads and verifies the cookie, never the database, because it runs on every request including prefetches. It sends logged-out visitors from `/tasks` to `/login?next=/tasks`, and signed-in taskers away from `/login` and `/signup`.
2. **`src/lib/auth.ts`** is the Data Access Layer and the real check. `getCurrentTasker()` verifies the session *and* loads the tasker from the database, so a still-valid JWT for a deleted account grants nothing. It's wrapped in React's `cache()` so several callers in one render share a query.

Never rely on the proxy alone for protection — it's the convenience layer, and the DAL is the security boundary.

### What `GET /api/tasks` deliberately omits

The `select` returns only `id`, `category`, `urgency`, `location`, `budget`, `description`, and `createdAt`. The client's `name`, `email`, `phone`, and the task's `magicToken` are never sent to this endpoint — that contact information is what taskers will pay tokens to unlock in phase 4. Keep the `select` explicit rather than returning whole rows.

The `description` is sent as a **preview only**: `truncateWords()` cuts it to `TASK_PREVIEW_WORDS` (25) and appends an ellipsis. Truncation happens on the server, not in CSS — `line-clamp` would hide the overflow visually while still shipping it in the HTML for anyone reading the page source.

### Contact stripping

Clients routinely type "call me on 416-555-0134" into a description, which would let a tasker skip the unlock entirely. `redactContactInfo()` replaces phone- and email-shaped text with `[hidden]` on **write** (both `POST /api/tasks` and `PATCH .../manage/[token]`), so the raw details never reach the database. The response carries a `warning` string, which the confirmation and manage pages display; the post form also says so upfront.

It's a deterrent, not a guarantee — "four one six…" style evasion still gets through. The phone matcher only fires on 10–15 digit runs so budgets and measurements ("1200 - 1500", "12 x 24 ft") are left alone.

Balances are ledger-backed from the first row: `tokenBalance` should always equal the sum of that tasker's `WalletTransaction.amount` values.

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
    api/tasks/route.ts                   GET: open-task feed (taskers) / POST: create a task
    api/tasks/manage/[token]/route.ts    GET / PATCH / DELETE by magic token
    api/auth/signup|login|logout/        Tasker account + session routes
    post-task/                           Posting form + confirmation page
    manage/[token]/                      Edit / delete a task via magic link
    signup/, login/                      Tasker auth pages
    tasks/                               Open-task feed (logged-in taskers only)
    page.tsx                             Landing page
  components/
    TaskForm.tsx                         Shared form for creating and editing
    AuthForm.tsx                         Shared email + password form
    MagicLinkPanel.tsx                   Magic link display + copy button
    LogoutButton.tsx                     Clears the session
  lib/
    prisma.ts                            Prisma client singleton (pg driver adapter)
    tasks.ts                             Field constants, validation, token generation
    email.ts                             Resend client + magic-link email
    session.ts                           JWT encrypt/decrypt + session cookie
    auth.ts                              Password hashing + DAL (getCurrentTasker)
  proxy.ts                               Optimistic auth redirects (was: middleware)
  generated/prisma/                      Generated client (gitignored)
prisma7.config.ts        Prisma CLI config; loads .env.local
.env.example             Template for .env.local
```

## Notes on the Prisma 7 setup

- Prisma 7 requires a **driver adapter** for SQL databases; this project uses `@prisma/adapter-pg` over the `pg` driver.
- The generated client lives at `src/generated/prisma` (Prisma 7 requires an explicit output path) and is **not** committed — it's rebuilt on `npm install`.
- The Prisma CLI doesn't read `.env.local` on its own, so `prisma7.config.ts` loads it via `dotenv` to keep the CLI and the app on the same connection string.

## Data model

- **Task** — a client's posted job. `magicToken` is a unique token for passwordless access to their own task. `phone` is optional contact info. `deletedAt` marks a soft delete; `status` is one of `open`, `claimed`, `done`, `cancelled`.
- **Tasker** — a registered tasker. Starts with a `tokenBalance` of 5.
- **Unlock** — records that a tasker paid to reveal a task. Unique on `(taskerId, taskId)` so a tasker is never charged twice for the same task.
- **WalletTransaction** — token ledger: `signup_grant`, `unlock_spend`, `stripe_topup`.
- **RateLimitHit** — one row per throttled attempt, counted within a time window. Indexed on `(bucket, createdAt)`; rows self-prune after 24h.
- **EmailVerificationToken** — one-time link a new tasker clicks to confirm their address and receive the signup grant. Deleted once redeemed.
