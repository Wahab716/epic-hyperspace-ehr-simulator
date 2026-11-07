# epic-hyperspace-ehr-simulator
An Epic Hyperspace-inspired EHR training simulator featuring clinical workflows, IT support, SQL analytics, and reporting.

## Current status

Read-only clinical workspace with Patient Lists, fictional patient details, activity tabs, a summary dashboard, laboratory tables, historical notes, medication tables, and a note sidebar.

Select **Open Clinical Workspace** on the home page, or visit http://localhost:3000/clinical/index.html. Select a patient and use **Open Chart**, double-click a patient row, or use a patient shortcut in the top bar. Browse Summary, Results, Notes, and the other chart tabs. Authoring and search controls are disabled in this milestone.

State stays in memory and resets on reload. No patient data is saved or sent to a backend. Editing, patient search, and connected workflows arrive in later milestones.

## Development

Requires Node.js 22.13 or newer and npm (included with Node.js).

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

- `app/`: application layout, landing page, and styles.
- `public/clinical/`: clinical workspace HTML, JavaScript, and styles.
- `public/`: other static assets.
- `tests/`: chart rendering and navigation checks.
- `vendor/`: third-party styles and their license.

The dependency set is carried forward from the supplied complete simulator to keep later milestones compatible; many dependencies are not used by this initial page. The npm lockfile records the resolved dependencies.

This is an independent educational project using fictional records. It is not affiliated with Epic Systems and does not provide Epic certification.
