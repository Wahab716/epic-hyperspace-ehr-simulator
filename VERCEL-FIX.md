# Vercel demo hosting fix

The Node/SQLite edition originally tried to write `.data` under `/var/task`, Vercel's read-only application directory. This patch keeps SQLite, the API, clinical workflows and UI, with no new dependency.

Changes:
- One shared path resolver uses `/tmp/epic-hyperspace` on Vercel and `.data` locally. An explicit WORKSPACE_DATA_DIR remains honored.
- Hosted public demo sessions use the existing signed HttpOnly cookies; localhost-only restrictions remain for local mode and trusted-proxy mode is unchanged.
- The SQLite migration is explicitly included in the serverless API bundle.
- A hosted-demo message states that practice storage is temporary. Local database files are not moved, reset or deleted.

## Deploy

1. Copy the ZIP contents over the existing repository; keep `.git`, `.data` and private local settings. Commit and push.
2. In Vercel Project Settings → Environment Variables, set WORKSPACE_AUTH_MODE to `demo` and WORKSPACE_SESSION_SECRET to a long random secret (at least 32 characters). Use one stable secret per environment; do not commit it to Git. Generate one locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. Remove an old WORKSPACE_DATA_DIR override pointing at `.data` or `/var/task`. Let the code choose the temporary directory automatically. Use the Node.js 24 runtime.
4. Redeploy, then open the new deployment. If an older cookie is rejected after the signing-secret change, reload to receive a new demo session.

The demo is publicly accessible; signed cookies separate practice sessions, but they are not a user-login system. Vercel Deployment Protection can restrict who reaches it.

## Storage limit

`/tmp` is ephemeral and isolated per server instance. Records may disappear on cold starts, scaling or redeploys, and a stable signing secret does not make SQLite durable. Export important practice work; the local `.data` edition remains persistent. This patch fixes deployment startup for a temporary demo, not persistent hosted storage. Persistent multi-instance use requires an external database adapter. A continuously running Node reporting worker is not started by Vercel; queued/due jobs still have the existing request-time fallback.

Verification: full automated tests, TypeScript, lint and production build; Vercel-mode API smoke check and bundled-migration tracing checked before delivery. No live Vercel deployment was performed here.
