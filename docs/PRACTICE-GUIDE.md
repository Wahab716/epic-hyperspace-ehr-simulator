# Practice guide

## First session

1. Open Clinical and select Registrar. Register a fictional patient, schedule an appointment, check it in, and admit/transfer the encounter. Notice the distinction between a patient and one visit.
2. Select Attending to order a lab; use Nurse to collect, receive and process its specimen. Enter a result and use Attending to document critical-result follow-up. Practice Resident → Attending note cosigning and signed addenda.
3. In IT Support, investigate INC-1003 as Application Analyst: record impact/scope/hypothesis, inspect all evidence sources, map K_LOCAL and replay the message. Verify the associated result, retry without duplication, and complete the incident's structured resolution.
4. In Analytics, select Reporting Analyst and refresh the snapshot. Run SQL, inspect schema, save a query and check an exercise. Clinical edits appear only after the next load.
5. In Training, follow the seven day cards. A reflection requires at least 15 characters and does not satisfy missing evidence checks. Existing saved evidence may satisfy days 1–6. Audit-based checks use the retained 2,000-action history.

## Connected capstone

Start an attempt (type START) before registering a new fictional patient. Link their MRN in Training, admit them, create/sign/collect a Lab order, then advance its specimen to Received and Processing. Use Application Analyst to compose an inbound message for that order with a unique control ID and an unmapped local code. Replay once to record rejection; add the code mapping, replay successfully, and retry to prove deduplication. Return to Clinical to review critical results. Run a clean reporting load as Reporting Analyst, save the capstone investigation document and day 7 reflection. The ten evidence criteria each contribute ten points and must refer to linked records. Starting another attempt replaces tracking and clears day 7 reflection without deleting clinical data.

## Reports and pipeline failures

Reports provides eleven aggregate comparison metrics and the original eleven detailed populations: census, admissions, discharges, length of stay, no-show rate, unsigned notes, cosignatures, orders without results, result turnaround, interface backlog, and ticket resolution. Metadata specifies each report's grain, population, exclusions, time scope and applicable filters. Date windows use UTC with an inclusive start and exclusive end. Department/date filters only apply where stated; they do not silently constrain every report. Missing or invalid elapsed-time inputs produce null, and an empty no-show denominator returns null.

Source is the current operational record; staging is an extracted copy; reporting extract is the loaded dataset; cache is the dashboard copy; warehouse contains encounter facts and department dimensions. Counts alone cannot detect changed codes or timestamps, so inspect content comparisons as well. Audit/load-run tables are excluded from equality reconciliation because loading creates new history entries.

Select a failure, refresh or queue a job, and inspect the stages/history. Failed extraction preserves previous successful stages. Other simulated faults may deliberately load anomalous records and mark Validation required. Recover by selecting None and loading again. Failed jobs remain in history; queue a new job after fixing the failure. Hourly and queued loads use atomic versions so they cannot overwrite concurrent clinical saves. Reload the saved workspace after a worker finishes.

## Documentation, exports and checkpoints

Training's documentation workbench saves investigation notes, clinician updates, escalations, root-cause analyses, knowledge-base articles, change requests, test plans, report requirements and validation checklists. Practice exports include these artifacts, reflections/checks, capstone evidence, incident rubrics, SQL progress and reporting history. JSON is structured evidence; Markdown is a readable journal. The workspace JSON export additionally contains the current chart and hospital state, without credentials or other sessions. Exported files are not automatically imported back.

Save a checkpoint before resetting or exploring a failure. Up to three full-session snapshots are retained; delete one to make room. Restore replaces current records and pauses hourly scheduling, but queued jobs remain eligible. Reset clears current records and keeps saved checkpoints. Capacity is bounded: export evidence and remove an old checkpoint if a save reports snapshot capacity reached.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Node SQLite module unavailable | Install Node 22.13+; verification used Node 24. Restart the terminal, check `node --version`, then run `npm ci`. |
| Port 3000 in use | Stop the older development/production server, then start one instance. |
| HTTP 409 after another tab or worker save | Reload saved workspace, review the preserved form, and resubmit. |
| Workflow action denied | Select the documented practice role; do not broaden another user's permissions. |
| Report is stale | Refresh or process a reporting job and compare extraction/cache timestamps. |
| Jobs do not run with browser closed | Keep `npm run worker:reports` running in a second terminal with the same working directory/data-directory environment. |
| Existing records appear missing | Use the same browser profile/cookies, localhost address and data directory. Clearing cookies creates a separate session. Do not reset or delete `.data`. |
| Privacy scenario blocks CSV | Export is deliberately disabled by the scenario. Inspect schema/results and use the incident workflow to investigate. |
| Chart search returns no matches | Clear or refine name/MRN/DOB. Searching never substitutes an incomplete record into the historical chart. |

Original chart historical grids and reference-note templates are fixtures. The connected clinical views are authoritative for newly created practice records. The two interfaces do not imply exact hospital-specific Epic behavior or complete historical document transcription.
