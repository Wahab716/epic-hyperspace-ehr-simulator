# 10/10 — Final setup, integration and verification

Completed 2026-11-10. Cumulative source includes milestones 1–9.

Final integration restores the original eleven detailed report populations, their filter/calculation metadata and CSV export, plus the general documentation workbench and current-workspace JSON export. API output now uses a single normalized hospital per response and keeps saved checkpoint bodies server-side. Same-port loopback aliases work with the origin check, while foreign origins and mismatched ports remain rejected. A remaining chart-reference phrase was replaced with ordinary clinical wording.

Added the current setup/update/backup guide, practice/troubleshooting guide, source reconciliation inventory and inactive original-source archive, final verification record, `npm run verify` and GitHub verification workflow. No dependency or lockfile versions changed.

Validation: 77 tests, TypeScript, lint, production build, production HTTP/standalone-worker smoke checks and seven React view-render checks passed. Chromium interactive QA was blocked at launch by the environment; no deployment or remote Git update is claimed. Details and fidelity limits are in FINAL-VERIFICATION.md and docs/SOURCE-RECONCILIATION.md.

Update: stop the app and reporting worker, copy ZIP contents over the existing checkout, keep .git/.data/cookies/private settings, then run npm ci and npm run verify. Start npm run dev and optionally npm run worker:reports in a second terminal. Open http://localhost:3000.

Commit: docs: finalize simulator setup and verification

Progress: 1–10 complete. The source ZIP includes all current npm functionality and the reconciled original-source reference.
