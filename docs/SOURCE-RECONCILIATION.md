# Source reconciliation

Compared the final cumulative npm project against `Hyperspace-clean-copy-source(1).zip`, the supplied complete-source reference, on 2026-11-10. All 155 eligible original files are preserved byte-for-byte inside `reference/original-source-reference.zip`. `reference/original-source-inventory.json` records each original path, SHA-256 and active-tree disposition. Nineteen files are also active and identical, sixteen paths have adapted active implementations, and 120 files are reference-only. Counts describe original paths; newly authored npm-edition files are additional.

The reference archive is an inactive source record, not a second app to install. It prevents framework migration from discarding original source and licenses. It intentionally excludes checkout-specific `.openai` metadata, dependency/build/runtime folders and private environment files. It preserves original pnpm/build/deployment support files as reference while the active app uses npm and Node SQLite. The source inventory distinguishes archived original code from code executed by the npm edition.

| Original area | Active npm implementation / disposition |
| --- | --- |
| `public/clinical/` chart | Preserved chart interface, state normalizer, API persistence bridge and search/layout regression coverage; connected current records through React clinical views |
| Original React page/Expansion | Split into ClinicalWorkspace, ClinicalPanels, SupportPanels, AnalyticsPanels, ReportingPanels and TrainingPanels |
| `lib/training/domain`, catalog, assessments, reference data | Active shared clinical/support foundation with validated workflow boundary, training evidence checks and reporting integration |
| `lib/training/reports.mjs`, report-metadata | Restored active detailed populations and metadata, alongside milestone 8 aggregate comparisons |
| Original documentation/artifact workbench | Active Training documentation workbench, evidence JSON/Markdown exports and current-workspace JSON export |
| Snapshots/reset | Active full-session checkpoints include chart plus hospital; versioned confirmation/restore/reset and isolation tests |
| D1 workspace/API/auth | Replaced in the active app by signed local sessions, optional trusted-proxy mode, Node SQLite store and atomic versioned API; original D1 source archived |
| Cloudflare native scheduler | Replaced for local use by the standalone Node reporting worker and request-time fallback; no active Cloudflare adapter or hosted deployment is claimed |
| SQL.js/SQLite exercises | Active bundled browser worker, fifteen exercises, saved queries/history and privacy-aware CSV |
| Original tests and status/specification documents | Archived intact; active npm-specific regression tests cover the current runtime. Historical verification claims are not substituted for current checks |
| UI component library, connector scaffolding, framework/install scripts and examples | Archived reference where unused by the active npm edition; existing dependency set/lockfile retained |

## Fidelity and scope

This completes the ten-step npm progression. It does not claim byte-identical execution of the original Cloudflare build, proprietary Epic configuration features, exact unseen historical-document transcription, independently certified clinical report populations, or complete original-specification fidelity. The original status documents themselves identify these limits. The chart's historical grids remain fixtures; new records are authoritative in the connected clinical views. Exact screenshot comparison and current interactive-browser verification remain unverified.

Source preservation, implemented workflow coverage, and verification are separate facts. See `FINAL-VERIFICATION.md` for checks actually run against this release.
