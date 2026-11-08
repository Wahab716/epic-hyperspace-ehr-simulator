# epic-hyperspace-ehr-simulator
An Epic Hyperspace-inspired EHR training simulator featuring clinical workflows, IT support, SQL analytics, and reporting.

## Current status

Interactive clinical workspace with database-backed saving, local practice sessions, version checks, and browser recovery copies. Clinical features from the previous milestone remain available: patient search, chart tabs, notes, orders, sticky notes, measurements, and review indicators.

Select **Open Clinical Workspace** on the home page, or visit http://localhost:3000/clinical/index.html. Existing practice work from the previous milestone is imported when this browser session first creates a database workspace. Wait for **Saved to this computer** before closing the page.

The SQLite database and local session key are created automatically in `.data/`. No database account, Cloudflare account, environment file, or manual migration command is needed for local development. Database work survives restarting the app. Keep the `.data/` directory when updating the project; it is excluded from Git and build archives.

Each browser session receives a signed, HttpOnly cookie. Tabs in the same browser profile share a workspace; a different browser profile gets a separate one. Cookies last 30 days. Clearing cookies or allowing the session to expire starts a new session; the old database row remains but is not a public login account. This is local practice session isolation, not a production healthcare login system.

The footer shows loading, unsaved, saved, or conflict status. If two tabs edit the same revision, the stale save is rejected. Its edits stay in that tab, with a per-tab recovery copy when sessionStorage is available. **Download browser backup** saves its chart snapshot as JSON; **Load saved copy (replace tab edits)** explicitly replaces that tab's unsaved edits. No conflicting snapshot is automatically written over newer saved work. Database-backed work is retained even if browser storage is blocked; browser-only recovery then depends on keeping the page open.

**Reset practice** resets this session's database workspace and browser copy. It does not affect other sessions. Use fictional information only; simulated orders and communications do not reach a clinical system.

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

- `app/`: application layout, landing page, and workspace API route.
- `lib/workspace/`: SQLite adapter, session authentication, and versioned API service.
- `db/`: table schema and idempotent SQL migration.
- `public/clinical/`: clinical workspace HTML, JavaScript, and styles.
- `public/`: other static assets.
- `tests/`: chart rendering, authoring, API validation, session isolation, conflict handling, and database persistence checks.
- `vendor/`: third-party styles and their license.

The dependency set is carried forward from the supplied complete simulator to keep later milestones compatible; many dependencies are not used by this initial page. The npm lockfile records the resolved dependencies.

This is an independent educational project using fictional records. It is not affiliated with Epic Systems and does not provide Epic certification.

## Workspace API and hosting

`GET /api/workspace` returns the current session's workspace, version, and opaque workspace identifier. `POST /api/workspace` accepts `{version, action, payload}`. This milestone supports validated `clinical` snapshots and an explicit `reset`; unsupported actions and role changes are rejected. Snapshot writes use an atomic version comparison, returning HTTP 409 for stale updates. Invalid snapshots do not partially update stored records. Successful writes increment the version.

Local SQLite is a Node runtime storage adapter for running this repository with npm. The table layout follows the supplied simulator's owner/data/version/updated-at schema. Connected clinical domain actions and additional training roles arrive in later milestones.

For a trusted reverse proxy, set `WORKSPACE_AUTH_MODE=trusted-proxy` and a strong `WORKSPACE_PROXY_SECRET`. The proxy must strip incoming identity/secret headers, authenticate visitors, and inject `oai-authenticated-user-id` plus `x-workspace-proxy-secret`. Requests without the matching shared secret and identity are rejected. Direct client-provided identity headers are never accepted in local mode. The repository does not provide an external identity provider or proxy deployment.

Optional server environment settings are described in `.env.example`. Use a writable persistent volume for `WORKSPACE_DATA_DIR` if hosting this Node server. The default local SQLite adapter requires a filesystem and is not a Cloudflare Worker/D1 adapter. Local database/session files and environment secrets must remain outside Git.
