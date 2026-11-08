# epic-hyperspace-ehr-simulator
An Epic Hyperspace-inspired EHR training simulator featuring clinical workflows, IT support, SQL analytics, and reporting.

## Current status

Interactive clinical workspace with Patient Lists, name/MRN search, fictional patient charts, laboratory tables, historical notes, and a note sidebar.

Select **Open Clinical Workspace** on the home page, or visit http://localhost:3000/clinical/index.html.

- **Patient Station / Add Patient:** search by full/partial name or MRN, then Accept. Search results never replace the selected chart with an invalid patient.
- **Notes:** choose New Note, write in the sidebar, and Pend. SmartText templates, a cosigner field, and simulated signing are available. Complete all `***` fields before signing.
- **Sticky notes:** open the yellow note icon in the patient sidebar. Each patient has a separate private practice sticky.
- **Orders:** create and discontinue practice orders. Orders and intake/output measurements belong to the selected patient.
- **Review:** mark results or notes as reviewed.
- **Reset practice:** remove this simulator's locally saved practice state.

Practice work is saved in this browser using localStorage. Reloading returns to Patient Lists while retaining saved notes, orders, stickies, and patient-list membership. Clearing browser data removes this work. There is no backend or cross-device synchronization yet; connected workspace storage arrives in the next milestone. If browser storage is unavailable, practice remains usable for the current page session.

Use fictional information only. These controls simulate workflows and do not issue real orders or clinical communications.

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
- `tests/`: chart rendering, patient search, local persistence, and authoring checks.
- `vendor/`: third-party styles and their license.

The dependency set is carried forward from the supplied complete simulator to keep later milestones compatible; many dependencies are not used by this initial page. The npm lockfile records the resolved dependencies.

This is an independent educational project using fictional records. It is not affiliated with Epic Systems and does not provide Epic certification.
