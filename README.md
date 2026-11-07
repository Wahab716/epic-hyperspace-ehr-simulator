# epic-hyperspace-ehr-simulator
An Epic Hyperspace-inspired EHR training simulator featuring clinical workflows, IT support, SQL analytics, and reporting.

## Current status

Application scaffold with a basic landing page. Clinical workflows, support scenarios, analytics, and reporting will be introduced in subsequent milestones.

## Development

Requires Node.js 22.13 or newer and npm (included with Node.js).

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm run typecheck
npm run lint
npm run build
npm start
```

## Project structure

- `app/`: application layout, landing page, and styles.
- `public/`: static assets.
- `vendor/`: third-party styles and their license.

The dependency set is carried forward from the supplied complete simulator to keep later milestones compatible; many dependencies are not used by this initial page. The npm lockfile records the resolved dependencies.

This is an independent educational project using fictional records. It is not affiliated with Epic Systems and does not provide Epic certification.
