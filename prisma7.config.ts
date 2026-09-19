import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads `.env.local` automatically, but the Prisma CLI does not.
// Load it here so `prisma migrate` / `prisma studio` use the same connection string.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
