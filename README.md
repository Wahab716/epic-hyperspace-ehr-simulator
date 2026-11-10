# Epic Hyperspace EHR Simulator

A full-stack educational EHR simulator with a Hyperspace-inspired chart, connected clinical workflows, IT support investigations, SQLite analytics, reporting, background jobs, and guided training. Built with Next.js, React, JavaScript/TypeScript and SQLite. All patient and hospital records are fictional.

The ten-milestone npm edition is complete. See [FINAL-VERIFICATION.md](FINAL-VERIFICATION.md) for checks and remaining verification limits, and [docs/SOURCE-RECONCILIATION.md](docs/SOURCE-RECONCILIATION.md) for the original-source comparison.

## Run locally

Requires Node.js 22.13 or newer and npm. Node 24 is used for the final verification. No database account, Cloudflare account, external API credentials, or environment file is required for local practice.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production build:

```sh
npm run verify
npm start
```

`verify` runs automated tests, TypeScript, ESLint, and the production build. Keep the server running while using the application. Run background reporting in a second terminal from the same directory:

```sh
npm run worker:reports
```

Use the same `WORKSPACE_DATA_DIR` for the server and worker if overriding the default. The worker processes queued and opted-in hourly jobs every five seconds; it needs no open browser. Hourly scheduling starts disabled. Opening/reloading the workspace also processes due work. Missed hours coalesce into one load.

## Update an existing checkout

Stop the app and reporting worker. Copy the final ZIP's contents into the existing repository and replace matching files. Keep `.git/`, `.data/`, browser cookies and private local environment settings. Do not delete your database or reset practice to update. Then run `npm ci` and `npm run verify`.

For Windows PowerShell, from the existing repository:

```powershell
npm ci
npm run verify
npm run dev
```

After reviewing the source changes:

```powershell
git add .
git diff --cached --stat
git diff --cached
git commit -m "docs: finalize simulator setup and verification"
git push
```

The ZIP does not itself modify your remote repository or deployed website.

## Workspaces

| Area | Features |
| --- | --- |
| Clinical | Patient registration/search, appointments/check-in, encounters, admission/transfer/discharge, orders/specimens/results, corrected results and follow-up, medication reconciliation/MAR, note drafting/signing/cosigning/addenda, observations, stickies, lists and simulated communication |
| IT Support | Twenty incidents with caller/log/configuration evidence, authorized actions, verification, resolution feedback, directory/access approvals, simulated diagnostics, interface mapping/replay/correction/deduplication/quarantine, API failure lab, tested/approved configuration changes and rollback, audit |
| Analytics | Browser-worker SQLite, fifteen SQL exercises with varied datasets, saved queries/history, CSV export, schema browsing, eleven aggregate comparison metrics, eleven detailed operational report populations with metadata/date/department filters, staging/extract/cache/warehouse comparisons, failure injection and persistent reporting jobs |
| Training | Seven-day learning path, evidence checks, reflections, linked patient-to-report capstone, incident rubrics, general documentation workbench, JSON/Markdown exports, full-session checkpoints, restore/reset and workspace export |

The role selector enables educational handoffs. Choose Registrar for registration/ADT, Nurse for specimens/MAR, Resident or Attending for clinical orders/notes, Help Desk for incidents, Application Analyst for interfaces/configuration, Access Administrator for approved role changes, and Reporting Analyst for SQL/reporting. An Attending approves tested configuration changes. Server workflow rules validate selected-role actions; these practice personas are not production staff accounts.

The original **Chart workspace** retains the reference interface and historical fictional fixtures. **Connected practice record** links to shared current workflows. New clinical results and new patients are managed through the connected views; historical chart grids remain fixtures. Reference appearance, general workflow simulation and educational support consoles have different fidelity levels. The simulator does not reproduce proprietary Epic administration tools.

## Persistence, conflicts and recovery

The app creates `.data/workspaces.sqlite` and a local session-signing secret. Saved work survives restarts. Signed cookies separate browser-profile sessions for 30 days; clearing cookies starts a new session without deleting older records. Do not share session cookies. Every write compares the workspace version; a stale tab receives HTTP 409 and must reload before resubmission. Open forms retain their content so you can review before retrying.

**Training → Snapshots & reset** stores up to three complete checkpoints, including the chart and connected records. Restore requires RESTORE, advances the live version, retains checkpoints, and disables the restored hourly schedule. Queued jobs can still run. Reset requires RESET, clears current practice records and progress, and retains checkpoints. The original chart reset also resets connected records. Other sessions are unaffected. Exported JSON is for review/backup evidence; an arbitrary JSON import endpoint is not provided.

For a filesystem backup, stop both the app and worker and copy the entire `.data/` directory, including any SQLite sidecar files and `session-secret`, to a private backup location. Restore the complete directory while both processes are stopped. Keep the matching browser cookies to reopen that session. A source ZIP intentionally excludes runtime data and credentials.

## Practice guide and troubleshooting

See [docs/PRACTICE-GUIDE.md](docs/PRACTICE-GUIDE.md) for the role sequence, capstone, reports, failure recovery, exports and troubleshooting. Optional environment variables are listed in [.env.example](.env.example). The reporting worker does not automatically load Next.js `.env.local`; configure shared environment variables in both terminals if needed.

## Structure and hosting

- `app/`: React workspaces and `/api/workspace`.
- `lib/workspace/`: Node SQLite storage, signed sessions, versioned service, workflow boundary, reporting jobs and training.
- `lib/training/`: clinical/support domain logic, historical fixtures, assessments and detailed reports.
- `public/clinical/`: original chart interface and its browser persistence bridge.
- `public/`: SQLite worker/exercises/CSV helpers; bundled SQL.js engine, WASM and license in `public/vendor/`.
- `db/`: SQLite schema and idempotent migration.
- `scripts/reporting-worker.mjs`: standalone reporting process.
- `tests/`: workflow, API, persistence, clinical rendering/interactions, SQL, reporting and training regression tests.
- `vendor/`: third-party CSS and license.
- `reference/`: inactive sanitized original-source archive and file reconciliation inventory.

Production hosting needs a Node runtime and writable persistent filesystem. Configure a separate identity provider/reverse proxy for authenticated remote use: `WORKSPACE_AUTH_MODE=trusted-proxy`, a strong `WORKSPACE_PROXY_SECRET`, and a proxy that strips incoming identity/secret headers before injecting verified `oai-authenticated-user-id` and `x-workspace-proxy-secret`. Local mode does not trust client-supplied identity headers. The archive's original Cloudflare/D1 runtime is preserved for reference; it is not the active npm application's storage or deployment adapter. No automatic Cloudflare deployment or hosted scheduler is configured by this package.

The dependency set and npm lockfile are retained from the milestone series. Licenses for bundled assets are preserved. This is an independent educational project, unaffiliated with Epic Systems. It demonstrates simulated practice, not Epic certification or production EHR experience. Do not enter real patient information.

## Vercel temporary demo

Vercel now uses writable `/tmp/epic-hyperspace` automatically and public signed-cookie demo sessions. Set a stable `WORKSPACE_SESSION_SECRET` in Vercel, use Node 24, and follow [VERCEL-FIX.md](VERCEL-FIX.md). Hosted practice data is ephemeral and can reset between instances or deployments; durable hosted storage still requires an external database. Local `.data` storage is unchanged.
