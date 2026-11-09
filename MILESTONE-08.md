# 8/10 — Reporting and background jobs

Completed 2026-11-09. Cumulative source includes milestones 1–7.

Added eleven report definitions/dashboard metrics; operational, staging, extract, and cache comparisons; warehouse facts/dimensions; nine selectable normal/failure modes; persistent queue, job outcomes and load IDs; hourly opt-in scheduling; standalone Node worker; workspace API integration and request-time processing fallback.

Validation: 68/68 automated tests passed; TypeScript, ESLint, and Next.js production build passed. Headless browser check at http://localhost:3000 passed report refresh, duplicate-source injection, validation status, queue, and manual processing with no page errors. Worker-core tests cover due scheduling, session isolation, repeat runs and concurrent-save protection. No Cloudflare scheduled Worker adapter or deployment is included.

Update: copy ZIP contents into the existing repository, replacing matching files. Keep .git, .data, browser cookies, and any private local environment settings. Run npm ci, npm test, npm run typecheck, npm run lint, npm run build, then npm run dev. For unattended reporting, run npm run worker:reports in another terminal using the same data directory.

Review git diff --cached --stat after git add .; commit as feat: add reporting and background jobs, then git push. This package does not itself change the remote Git repository.

Progress: 1–8 complete; 9–10 pending.
