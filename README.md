# epic-hyperspace-ehr-simulator
An Epic Hyperspace-inspired EHR training simulator featuring clinical workflows, IT support, SQL analytics, and reporting.

## Current status

Connected clinical workflows now run alongside the original chart workspace. Open http://localhost:3000 and use the Clinical navigation tabs. The practice-role selector enables educational handoffs between Registrar, Nurse, Resident, and Attending; the server validates each workflow action for the selected role.

- **Patients:** register fictional records, search by name/MRN/DOB, select patients, and update demographics. Duplicate and invalid/future birth dates are rejected.
- **Appointments:** schedule and reschedule, check in, cancel, mark no-show, or complete a visit. Check-in creates an encounter; cancellation preserves its history.
- **Encounters:** select encounter context, admit, transfer, and discharge. Occupied beds are protected and transfer history is retained.
- **Orders & Results / Specimens:** order → sign → collect → receive → process → finalize. Results support critical flags, follow-up, and corrections that retain prior values and require review again.
- **Medication reconciliation / MAR:** document home-medication decisions, complete reconciliation, and record Given/Held/Refused outcomes only after verifying the signed medication order and patient identity.
- **Notes:** create and edit drafts, sign, obtain attending cosign for resident notes, and add signed-note addenda. Signed text is immutable. Discharge requires completed reconciliation, a signed discharge summary, resolved home-medication decisions, and critical-result follow-up.
- **Summary / Communication:** observations, private stickies, personal list membership, and simulated internal/portal messages. No external messages or real orders are sent.

The original **Chart workspace** remains available with its historical fictional chart. Its expandable **Connected practice record** links to the selected patient's current workflow. Historical laboratory grids remain reference fixtures; new clinical results are managed under **Orders & Results**. New patients appear in the connected patient selector rather than being substituted into a historical chart fixture.

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

- `app/`: application layout, clinical navigation, workflow forms, and workspace API route.
- `lib/workspace/`: SQLite adapter, session authentication, versioned API service, and clinical workflow boundary.
- `lib/training/`: the supplied simulator’s shared domain foundation and reference fixtures.
- `db/`: table schema and idempotent SQL migration.
- `public/clinical/`: clinical workspace HTML, JavaScript, and styles.
- `public/`: other static assets.
- `tests/`: chart rendering, authoring, API validation, session isolation, conflict handling, and database persistence checks.
- `vendor/`: third-party styles and their license.

The dependency set is carried forward from the supplied complete simulator to keep later milestones compatible; many dependencies are not used by this initial page. The npm lockfile records the resolved dependencies.

This is an independent educational project using fictional records. It is not affiliated with Epic Systems and does not provide Epic certification.

## Workspace API and hosting

`GET /api/workspace` returns the current session's workspace, version, and opaque workspace identifier. `POST /api/workspace` accepts `{version, action, payload}`. This milestone supports validated `clinical` snapshots, explicit `reset`, and `workflow` commands with `{action, payload}`. Only the clinical practice roles and clinical workflow actions are exposed; other training environments arrive later. Snapshot writes use an atomic version comparison, returning HTTP 409 for stale updates. Invalid snapshots do not partially update stored records. Successful writes increment the version.

Local SQLite is a Node runtime storage adapter for running this repository with npm. The table layout follows the supplied simulator's owner/data/version/updated-at schema. The connected hospital is stored alongside the preserved chart snapshot in the same versioned workspace row. Shared domain modules are carried forward from the supplied complete simulator; support, SQL, reporting, and guided-training interfaces arrive in later milestones.

For a trusted reverse proxy, set `WORKSPACE_AUTH_MODE=trusted-proxy` and a strong `WORKSPACE_PROXY_SECRET`. The proxy must strip incoming identity/secret headers, authenticate visitors, and inject `oai-authenticated-user-id` plus `x-workspace-proxy-secret`. Requests without the matching shared secret and identity are rejected. Direct client-provided identity headers are never accepted in local mode. The repository does not provide an external identity provider or proxy deployment.

Optional server environment settings are described in `.env.example`. Use a writable persistent volume for `WORKSPACE_DATA_DIR` if hosting this Node server. The default local SQLite adapter requires a filesystem and is not a Cloudflare Worker/D1 adapter. Local database/session files and environment secrets must remain outside Git.
