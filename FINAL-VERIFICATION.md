# Final verification — npm edition 10/10

Date: 2026-11-10 (America/New_York). Runtime: Node v24.22.1, npm 11.9.0.

## Completed checks

- Clean dependency installation: `npm ci --ignore-scripts --no-audit --no-fund` succeeded. The npm lockfile is preserved from milestone 9; no dependency versions changed.
- `npm run verify`: 77/77 automated tests passed, TypeScript passed, ESLint passed, and Next.js production build passed.
- Regression coverage includes chart layout/search/invalid selection and authoring behavior, clinical state transitions and role rules, incident evidence and permissions, interface replay/correction/deduplication/quarantine, SQL exercises/CSV, reporting/failure modes, background schedules/concurrency, the linked capstone, reflections, artifacts, snapshots/reset/restore, persistence and session isolation.
- Detailed report tests enumerate all eleven populations against a known fixture and cover UTC boundaries, zero denominators, invalid intervals and negative durations. Metadata exists for all eleven report types.
- Production HTTP smoke check: server startup, workspace API, original chart assets, SQLite worker/WASM assets, standalone worker receipt persisted before any GET fallback, artifact/reflection saving, checkpoint/reset/restore all passed using an isolated temporary database.
- React server-render smoke check: all seven reporting/training views rendered without exceptions.
- Source reconciliation: all 155 eligible supplied-original files are preserved in the reference archive and individually inventoried. Active-tree adaptations and archived-only files are distinguished.
- Final packaging: cumulative milestone 9 files, npm lockfile, licenses and new support files retained; archive integrity and per-file SHA-256 manifest checked. Dependencies/build output/runtime database/session secrets/private environment files/Git history excluded.

## Browser and deployment limits

A fresh Chromium launch was attempted and failed before page navigation: the environment denied Chromium's process-singleton socket (`Operation not permitted`). Interactive rendering, clicks, download behavior and pixel-level screenshot comparison are therefore not claimed as passed for this final release. Server-render and HTTP checks do not replace interactive-browser QA.

No Git remote was changed and no existing hosted Site was redeployed during this npm ZIP delivery. The active runtime requires Node with writable persistent storage; archived Cloudflare/D1 source is not an active deployment adapter. Hosted authentication and scheduling need separate configuration.

The ten-milestone local source package is complete within the implemented educational scope. This is fictional-data self-practice, not proprietary Epic software, certification, production EHR experience or a medically validated clinical system.
