# 9/10 — Guided training and assessments

Completed 2026-11-09 (America/New_York). Cumulative source includes milestones 1–8.

Added Training navigation with the seven-day learning path, evidence checks and persisted reflections; linked capstone attempt baseline and patient selection; a ten-criterion capstone rubric; investigation documents; incident assessment views; JSON/Markdown evidence exports; three full-session snapshots; confirmed restore/reset operations; snapshot deletion and capacity protection. Restore/reset use the existing versioned API and preserve session isolation. Snapshot restoration also restores chart annotations, keeps snapshot history, disables hourly scheduling, and preserves the live version sequence.

Verification:
- 72/72 automated tests passed, including the full linked capstone through registration, admission, specimen processing, interface rejection/mapping/replay/deduplication, critical follow-up, reporting load, documentation, reflection, and export generation.
- API tests passed reflection persistence, snapshots, reset, restore, stale-version rejection and session isolation.
- TypeScript, ESLint and Next.js production build passed.
- Browser smoke test attempted but could not run: installed Chromium failed to launch because the environment denied its process-singleton socket. Browser rendering, interaction and download checks are not claimed as passed.

Update: extract ZIP contents into the existing checkout, replacing matching source files. Keep .git, .data and private environment settings. Run npm ci, npm test, npm run typecheck, npm run lint, npm run build, then npm run dev. Use http://localhost:3000 and open Training. The reporting worker from milestone 8 is unchanged and can continue using the same database.

Review the staged diff and commit with:

    git add .
    git diff --cached --stat
    git commit -m "feat: add guided training and assessments"
    git push

This package does not itself push or deploy the repository. Source archives exclude dependencies, build output, runtime database/session secrets, private environment files and Git history. Licenses and the existing npm lockfile are preserved.

Progress: 1–9 complete; 10 remains final integration, documentation, source reconciliation and verification.
