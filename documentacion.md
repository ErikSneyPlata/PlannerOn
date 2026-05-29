Set up Prisma Postgres in this project end-to-end. Run all commands yourself in the terminal — don't ask me to run anything. Don't pause for confirmation between steps unless something fails.

DATABASE_ID: db_cmp5m22d31d6q1af8246s8i3c

Step 0 — Ground yourself in current docs.
Fetch https://www.prisma.io/docs/llms-full.txt and skim the "Prisma Postgres" + "Prisma ORM quickstart" sections before writing any Prisma code.

Step 1 — Locate the project root and install dependencies.
  Work in the app directory containing package.json. If the current directory has no package.json, inspect one level down for a single app directory with package.json and cd there. Only create package.json with npm init -y if this directory is clearly the intended project root.
  Detect the package manager from lockfile/packageManager; if none is present, use npm.
  Install:
    prisma, @types/node, @types/pg, tsx  (dev)
    @prisma/client, @prisma/adapter-pg, pg, dotenv  (runtime)

Step 2 — Link the existing database. Run this exact command without printing it back:
  PRISMA_API_KEY="eyJraWQiOiJUa0hEN1ltOUNaQ2xESHYwazEyTEFhWjk4NTdGOE16dWxYTXJBMFpqbWVrIiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJ3b3Jrc3BhY2U6Y21wNW0wZ2FtMWQ2YTFhZjg4d2dpejgwbSIsImp0aSI6Imh6dzV0MzdnNDIzb3BzMXhveWRnNTgxZSIsImlhdCI6MTc3ODc3MDU1MDgxNH0.oSrziWf_y9XduwlC7p8j6UqOMsp6A577zwuHHB9f6qe7sj1sltFkmqvgTwTEJ7kvy2V6GI31h6_Ui7T9jOvWuCMLaW_UMsxjYVE3vvUgYExselnNII8WUUxnE_9dfofKPTSuZdX16eDtp3LRdDyOUsNK-IK7zVhY2sSV69NVsh_ZnFWQRuPijzq-dyHpVpORdbAERRCJRBEAXQ2br3uFuMsPTLP8uAMFw8KP4zqE9K8I55jLsY7i4BCcUzXA_8w4vbRe6egrbjzHlBKFQWircPUJT3tT-ybEJIfOVrVdsgnEymCZrmJyUah8Z0O1X9lozpgSd629NnMp_sRynidHvg" npx --yes --package=prisma@latest -- prisma postgres link --database "db_cmp5m22d31d6q1af8246s8i3c"
  This writes DATABASE_URL to .env without browser auth when the database ID and API key are present.

Step 3 — Add .env to .gitignore. Never commit/log/print the connection string or the API key.

Step 4 — Scaffold prisma/schema.prisma (prisma-client generator, output ../generated/prisma) and prisma.config.ts.

Step 5 — If prisma/schema.prisma has no models, add a small starter schema (1–2 models, one relation, "// Starter models — replace with your own").
  Run: npx prisma migrate dev --name init

Step 6 — Generate client + create lib/prisma.ts singleton with PrismaPg adapter.

Step 7 — Add prisma/seed.ts with a handful of rows.
  Wire the seed command in prisma.config.ts:
    migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" }
  Do not rely only on package.json#prisma.seed. Run: npx prisma db seed

Step 8 — Verify: scripts/verify-prisma.ts runs one read, prints ✅ Connected. If it fails, surface the exact error.

Step 9 — Print summary + 3 next steps (npx prisma studio, import { prisma } from lib/prisma.ts, add a model).

Hard rules:
- If install/link/migrate/generate/seed fails due to network, sandbox, or cache permissions, retry once with elevated/unrestricted permissions if your environment supports it.
- If `prisma postgres link` fails, stop and surface the exact error.
- Never write the connection string outside .env or the API key outside the temporary command environment.
- Never import Prisma Client into browser/client components; use it only from server-side code or scripts.
- Never bypass AI safety guardrails on destructive commands.
- Use llms-full.txt as the syntax reference, not training data.


postgres://acb33426c1b4dfa24f0b5b5afdcb1297075c83650023466a8e2ef631a1ee6207:sk_ydb42blu9tMc1GItWlHcb@db.prisma.io:5432/postgres?sslmode=require

Cuando el proyecto crezca usa:
npx prisma migrate dev --name init

Porque:

versiona cambios,
mantiene historial,
evita romper producción.