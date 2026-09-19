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
- `npm audit` reports pre-existing high-severity advisories in the Prisma CLI's transitive deps (`deepmerge-ts`, `mysql2`). Fixing them means downgrading to Prisma 6; leave them unless we're intentionally changing Prisma versions.
