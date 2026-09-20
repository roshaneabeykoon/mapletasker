<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MapleTasker

## Verification

Run all three before calling work done:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Gotchas

- After changing `prisma/schema.prisma`, run `npm run db:migrate`, then **restart `next dev`**. The dev server caches the generated client from `src/generated/prisma`, so new fields show up as `Unknown argument` errors in Prisma until it reloads.
- `src/lib/tasks.ts` is imported by client components, so it must stay free of Node-only APIs (that's why `generateMagicToken` uses Web Crypto, not `node:crypto`).
- The Prisma CLI reads `.env.local` only via `prisma7.config.ts`.
- Next 16 renamed `middleware` to **`proxy`** (`src/proxy.ts`). It does optimistic cookie-only auth checks; the real database-backed check is `getCurrentTasker()` in `src/lib/auth.ts`. Don't move authorization into the proxy — it runs on prefetches and must not hit the DB.
- `GET /api/tasks` must keep its explicit Prisma `select`. Client contact details (`name`, `email`, `phone`) and `magicToken` are paid-unlock data and must never appear in the tasker-facing feed. `description` is exposed only as a server-truncated preview (`truncateWords`) — never send the full text, since clients often put phone numbers in it.
- `SIGNUP_GRANT` (`src/lib/auth.ts`) is credited only when a tasker verifies their email via `verifyEmailToken`, never at signup. If you touch that transaction, keep the "delete the token, check the delete count, then grant" order — it's what makes two simultaneous requests with the same token unable to both succeed.
- Rate limits live in `RATE_LIMITS` in `src/lib/rate-limit.ts`. The limiter fails **open** by design. If you add a route that sends email or creates rows for anonymous callers, throttle it there too.
- Testing rate limits against the dev server leaves rows in `RateLimitHit` that will throttle you locally — `DELETE FROM "RateLimitHit";` afterwards.
- Session cookies use `secure: process.env.NODE_ENV === "production"`; hardcoding `secure: true` (as the Next docs example does) silently breaks login over local http.
- `npm audit` reports pre-existing high-severity advisories in the Prisma CLI's transitive deps (`deepmerge-ts`, `mysql2`). Fixing them means downgrading to Prisma 6; leave them unless we're intentionally changing Prisma versions.
