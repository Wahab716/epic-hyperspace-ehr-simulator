# epic-hyperspace-ehr-simulator
An Epic Hyperspace-inspired EHR training simulator featuring clinical workflows, IT support, SQL analytics, and reporting.

## Current status

Clinical workflows, IT support, and a SQLite analytics workbench now run alongside the original chart workspace. Open http://localhost:3000 and use the Clinical navigation tabs. The practice-role selector enables educational handoffs between Registrar, Nurse, Resident, Attending, Help Desk, Application Analyst, Access Administrator, and Reporting Analyst; the server validates each workflow action for the selected role.

- **Patients:** register fictional records, search by name/MRN/DOB, select patients, and update demographics. Duplicate and invalid/future birth dates are rejected.
- **Appointments:** schedule and reschedule, check in, cancel, mark no-show, or complete a visit. Check-in creates an encounter; cancellation preserves its history.
- **Encounters:** select encounter context, admit, transfer, and discharge. Occupied beds are protected and transfer history is retained.
- **Orders & Results / Specimens:** order → sign → collect → receive → process → finalize. Results support critical flags, follow-up, and corrections that retain prior values and require review again.
- **Medication reconciliation / MAR:** document home-medication decisions, complete reconciliation, and record Given/Held/Refused outcomes only after verifying the signed medication order and patient identity.
- **Notes:** create and edit drafts, sign, obtain attending cosign for resident notes, and add signed-note addenda. Signed text is immutable. Discharge requires completed reconciliation, a signed discharge summary, resolved home-medication decisions, and critical-result follow-up.
- **Summary / Communication:** observations, private stickies, personal list membership, and simulated internal/portal messages. No external messages or real orders are sent.

The original **Chart workspace** remains available with its historical fictional chart. Its expandable **Connected practice record** links to the selected patient's current workflow. Historical laboratory grids remain reference fixtures; new clinical results are managed under **Orders & Results**. New patients appear in the connected patient selector rather than being substituted into a historical chart fixture.

## IT support workspace

Select **IT Support**, then choose **Help Desk** or **Application Analyst** from the practice-role selector.

- **Tickets:** 20 evidence-driven incidents with scope/impact/hypothesis, caller/log/configuration evidence, supported actions, verification, structured resolution, rule-based writing feedback, and case-evidence JSON export. Unsupported attempts are recorded without granting unrestricted permissions.
- **Directory:** inspect users, approved roles, sessions, and escalation tasks. The nursing-access case requires an **Access Administrator** to execute APR-2; switching your training persona does not directly change another user's account.
- **System health:** inspect simulated availability and run restricted diagnostics. No shell commands execute on this computer or a hospital system.
- **Interfaces:** map local codes, replay messages safely, quarantine identity conflicts, and send source corrections with new control IDs. Successful interface replay creates results in the connected clinical workspace. Duplicate source/control IDs do not create duplicate results.
- **API lab:** simulate token, scope, environment, and availability failures (401/403/404/503), then inspect a valid FHIR-shaped JSON response. No external API calls or real credentials are involved.
- **Changes:** propose scoped configuration changes, record Positive/Negative/Permission/Regression evidence, obtain **Attending** approval, release as **Application Analyst**, and roll back with a recorded reason. Required-field and order-catalog changes affect the connected clinical workflows.
- **Knowledge base / Audit:** read investigation and validation guidance, and inspect the actor/action history of saved practice mutations.

Existing incident state, clinical records, and chart annotations stay in the same SQLite workspace. No reset is needed when updating. Some support cases use simulated reporting conditions as investigation evidence; SQL investigation is now available in Analytics.

## SQLite analytics practice

Select **Analytics → SQL workspace**, switch to **Reporting Analyst** (or **Application Analyst**), and click **Refresh SQL snapshot**. Refresh copies the current synthetic clinical/support records into a reporting extract; source changes do not appear until the next refresh.

The workbench runs actual SQLite in a browser worker using the bundled SQL.js JavaScript/WASM files. No CDN or additional npm dependency is needed. The synthetic schema includes empty tables and explicit column types. Queries are restricted to one read-only `SELECT`, `WITH`, or `EXPLAIN QUERY PLAN` statement, with a 2,000-row result limit and a five-second worker timeout. Running SQL does not modify the clinical source records or the local workspace database.

Fifteen exercises cover filtering, joins, distinct counts, null handling, outer joins, conditional totals, CTEs, window functions, corrected results, duplicate message controls, missing results, join multiplication, query plans, and reference populations. **Check exercise** compares results on the current extract, two variations, and an empty dataset. Assessment is inspectable client-side self-practice, not a secure examination.

Query history, named saved queries, and practice progress persist in the session's database workspace. **Export CSV** preserves ordered column names (including duplicates), empty-result headers, and quoted values. The privacy scenario disables SQL CSV export even if identifiers are aliased. Schema browsing and query execution remain available.

Existing clinical and support records are preserved when updating from commit 6. The analytics workbench reuses the same session and version checks. Reporting dashboards, report definitions, extraction-failure controls, and background jobs are available in the other Analytics tabs.

## Updating from the previous milestone

Copy these source files over your existing checkout. Keep `.data/`, your browser cookies, and your `.git/` directory. No manual database migration or reset is needed. Existing chart notes, orders, sticky notes, and measurements are retained and imported using stable identifiers. Unsaved sidebar drafts stay available in the original chart. Connected note and sticky changes are reflected in the saved chart copy where that record originated there.

The SQLite database and local session key are created automatically in `.data/`; database work survives restarting the app. No database account, Cloudflare account, or environment file is needed locally. Signed cookies separate browser-profile sessions and last 30 days. Clearing cookies starts a new session; it does not delete older database rows.

Every save uses the same workspace version. Stale writes return HTTP 409; the connected UI keeps an open form's contents and asks you to reload the saved workspace before submitting again. The original chart also retains its per-tab conflict recovery and downloadable browser backup. It never silently overwrites newer work from another tab.

**Reset practice** in the original chart resets both this session's chart and connected hospital records. Other sessions are unaffected. Use fictional information only; local practice roles are educational handoffs, not an enterprise account-permission system.

## Development

Requires Node.js 22.13 or newer and npm (included with Node.js). The server uses Node’s built-in SQLite driver. Development and production start commands bind to this computer’s loopback address by default.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

## Project structure

- `app/`: clinical, support, and analytics navigation, workflow forms, and workspace API route.
- `lib/workspace/`: SQLite adapter, session authentication, versioned API service, and clinical workflow boundary.
- `lib/training/`: the supplied simulator’s shared domain foundation and reference fixtures.
- `db/`: table schema and idempotent SQL migration.
- `public/clinical/`: clinical workspace HTML, JavaScript, and styles.
- `public/`: SQLite worker, exercise catalog, CSV helpers, and other static assets.
- `public/vendor/`: bundled SQL.js engine, WASM binary, and license.
- `tests/`: chart rendering, authoring, API validation, session isolation, conflict handling, and database persistence checks.
- `vendor/`: third-party styles and their license.

The dependency set is carried forward from the supplied complete simulator to keep later milestones compatible; many dependencies are not used by this initial page. The npm lockfile records the resolved dependencies.

This is an independent educational project using fictional records. It is not affiliated with Epic Systems and does not provide Epic certification.

## Workspace API and hosting

`GET /api/workspace` returns the current session's workspace, version, and opaque workspace identifier. `POST /api/workspace` accepts `{version, action, payload}`. This milestone supports validated `clinical` snapshots, explicit `reset`, and `workflow` commands with `{action, payload}`. Clinical, IT support, and SQL practice roles/actions are exposed. Reporting jobs and guided-training actions are available. Snapshot writes use an atomic version comparison, returning HTTP 409 for stale updates. Invalid snapshots do not partially update stored records. Successful writes increment the version.

Local SQLite is a Node runtime storage adapter for running this repository with npm. The table layout follows the supplied simulator's owner/data/version/updated-at schema. The connected hospital is stored alongside the preserved chart snapshot in the same versioned workspace row. Shared domain modules are carried forward from the supplied complete simulator; Reporting dashboards, jobs, and guided-training interfaces are connected.

For a trusted reverse proxy, set `WORKSPACE_AUTH_MODE=trusted-proxy` and a strong `WORKSPACE_PROXY_SECRET`. The proxy must strip incoming identity/secret headers, authenticate visitors, and inject `oai-authenticated-user-id` plus `x-workspace-proxy-secret`. Requests without the matching shared secret and identity are rejected. Direct client-provided identity headers are never accepted in local mode. The repository does not provide an external identity provider or proxy deployment.

Optional server environment settings are described in `.env.example`. Use a writable persistent volume for `WORKSPACE_DATA_DIR` if hosting this Node server. The default local SQLite adapter requires a filesystem and is not a Cloudflare Worker/D1 adapter. Local database/session files and environment secrets must remain outside Git.

## Reporting and background jobs (8/10)

Select **Analytics → Reports** as **Reporting Analyst** or **Application Analyst**. Eleven aggregate reports show their counting grain, population, source, extract, and cached totals. Metrics cover all dates; there is no implicit daily timezone filter. **Data pipeline** compares source/staging/extract counts, content equality, duplicate IDs, warehouse encounter facts, department dimensions, and load history. Audit and load-run tables are omitted from reconciliation because the load itself adds history entries.

Choose a simulated failure, then refresh or queue a load. Failed extraction preserves the last successful stages. Partial/late results, duplicate encounters, missing departments, changed mappings, shifted timestamps, and stale caches remain inspectable and are marked **Validation required**. This is a training pipeline; validation anomalies are deliberately visible in the loaded extract. Select **None** and rerun to recover. No failure injection changes clinical source data.

In **Background jobs**, queue a load, process it manually, or enable the hourly schedule. In a second terminal run:

```sh
npm run worker:reports
```

Keep that process running with the same `WORKSPACE_DATA_DIR` as the app. It checks persisted workspaces every five seconds without a browser. Opening/reloading the workspace also processes queued or due jobs as a fallback. An overdue schedule runs once and schedules the next load one hour later; it does not replay every missed hour. Failed jobs remain in history; queue another after fixing the failure. The worker restores the selected practice role and uses atomic version checks so concurrent clinical saves are preserved. Competing workers may calculate the same load, but only one version can be committed. This Node/SQLite runner does not provide a Cloudflare scheduled Worker adapter or operating-system service installation.

Use **Reload saved workspace** after a worker finishes; a concurrent browser save can return 409 and requires reload before resubmission. Queue state and hourly settings survive process restarts. The worker must run under an account authorized to read the local synthetic workspace database.

Commit message: `feat: add reporting and background jobs`

## Guided training and assessments (9/10)

Select **Training → Learning path** for a seven-day sequence through the existing clinical, service-desk, interface, SQL, reporting, and change workflows. Each day displays its practice roles, instructions, saved evidence checks, reflection, and completion state. Save at least 15 characters of reflection; completion also requires all displayed checks. Days 1–6 are workspace-level practice checks, so existing saved work can satisfy them. Audit-based checks use the retained audit history, which is limited to 2,000 actions. Assessment rules are transparent practice aids, not certification or a secure exam.

**Capstone** starts a new tracking baseline after typing START. Register a new fictional patient, link their MRN, admit them, create/sign/collect a lab order, and advance its specimen through Received and Processing. As Application Analyst, compose a message for that order with a unique control ID and a local code that has no mapping. Replay to observe rejection, map the code, and replay successfully twice to check deduplication. Review critical results in Clinical, then run a clean reporting load. Save the investigation document and day 7 reflection. The rubric has ten criteria worth ten points each; patient/encounter/order/message/result associations must match. Starting another attempt clears the day 7 reflection and replaces attempt tracking while preserving clinical records. Earlier completed interface work remains available, but rejection-history tracking starts with this milestone.

**Assessments & exports** shows incident evidence rubrics and exports practice evidence as JSON or Markdown, including day checks/reflections, capstone documents, incident assessments, SQL progress, reporting loads, and jobs. Full chart snapshots are not included in these exports. The incident workflow score and evidence-writing rubric are separate practice measures.

**Snapshots & reset** saves up to three full session checkpoints including chart annotations, connected records, progress, and the job queue. Name a snapshot before an exercise. Restore requires RESTORE, replaces current session records, retains saved checkpoints, advances the live workspace version, and disables the restored hourly schedule. Queued jobs remain eligible for the existing worker. Reset requires RESET, clears current practice data and training progress, and retains the three saved checkpoints. Delete unwanted checkpoints before saving more. Other sessions are unaffected. Snapshot capacity is bounded by the workspace size limit; export practice evidence before deleting older checkpoints. Snapshots contain synthetic practice records and remain local to the workspace database.

Commit message: `feat: add guided training and assessments`
