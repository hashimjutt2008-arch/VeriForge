# Current release: browser-only VeriForge

Completed 2026-09-16. The dashboard opens directly with no application authentication. File parsing, TypeScript cleaning, progress, results, history and all exports run locally through Web Workers and IndexedDB. Netlify is the only required host. Python backend/engine remain legacy reference code.

Final validation: production build, TypeScript, ESLint, formatting, 6,278 Python-equivalent records, 155 retained Python tests, and all six browser regression scripts passed. The 100,000-row workflow passed with Python off and no outgoing email data. See docs/BROWSER_ONLY_QA.md and docs/NETLIFY_DEPLOYMENT.md.

## Historical implementation ledger

The entries below record the original implementation and the subsequent migration. Original backend/auth deployment steps are superseded by the browser-only release above.

# VeriForge build progress

## Current phase
Phase 14 — final QA and release complete (September 14, 2026).

## Phase ledger
- Phases 0–14: complete. Evidence and important files appear below.
- Remaining local v1 work: none. Private hosting is deployment-specific and documented in README.md.

## Architectural decisions
- Python engine has no FastAPI/Next.js dependencies.
- Server-side temporary processing, no PostgreSQL/Redis for v1.
- Mandatory syntax, blank, duplicate safety guards protect the clean export; optional heuristics remain configurable.
- Corrections retain original and normalized values and their audit trail.
- Native Python/Next.js servers preserve the requested stack; Cloudflare Worker hosting cannot run this Python backend.

## Known limitations
- Single-process local backend with temporary jobs. Curated rules, ASCII syntax, exact-hostname company caps and first-worksheet XLSX import. Sessions/history reset on backend restart. See docs/QA_REPORT.md and README.md for operating limits and private deployment guidance.

## Phase 0 complete
Installation succeeded. Python smoke tests: 2 passed. Ruff passed. Frontend HTTP startup: 200. TypeScript passed. ESLint passed (one cosmetic warning subsequently fixed). Key files: pyproject.toml, requirements.lock, engine/models.py, backend/main.py, frontend/package.json, frontend/pnpm-lock.yaml, .env.example, docs/ARCHITECTURE.md. Limitation: no business workflow yet. Current work: Phase 1.

## Phase 1 complete
96 tests passed; Ruff check/format passed. Standalone list and streaming interfaces implemented. Each detector and correction family has regression tests, including every supplied example. Original values and correction trails survive later removal. Export invariant tested: unique VALID + CORRECTED only. No network access test passed.
Files: engine/{normalizer,corrections,syntax_validator,asset_detector,system_detector,sms_gateway_detector,placeholder_detector,example_detector,disposable_detector,duplicate_detector,domain_frequency,suspicious_detector,classifier,processor,exports,data}.py; rules/*.json; tests/test_engine.py.
Limitations: curated disposable/provider lists; ASCII dot-atom syntax only; exact hostname domain caps. Unknown .co domains require operator-supplied evidence. The explicit 20ryan correction from the supplied specification is stored as editable address-specific evidence, not a blanket first-name rule. Current work: Phase 2.

## Phase 2 complete
110 tests passed. CSV/TXT/XLSX reading, column detection/selection, header inference/override, blank handling, row mapping, 500-record writes, disk-backed pagination and six CSV/XLSX exports implemented. A 10,000-row streaming test passed; exports match status counts. Files: engine/files.py, engine/report.py, tests/test_files.py. Limits: UTF-8/UTF-16 text; first worksheet; 256 columns and 4096 characters per cell; CSV formula-risk values receive an apostrophe, while XLSX stores literal strings. Current work: Phase 3.

## Phase 3 complete
116 tests passed, including all file formats, auth enforcement, processing, progress, duplicate-start prevention, pagination/filtering and every download. Live Uvicorn health endpoint returned 200. Files: backend/{main,auth,config,schemas,jobs}.py; tests/test_api.py. Limits: one API worker process, two processing slots, no persistent history yet. Two upstream FastAPI/Starlette test-client deprecation warnings are non-fatal. Current work: Phase 4.

## Phase 4 complete
122 tests passed and Ruff passed. Signed opaque sessions, 12-hour expiration, HttpOnly/SameSite=Strict cookies, Secure on HTTPS, logout revocation, constant-time credential checks, five-failure/15-minute login throttling and strict mutation-origin checking implemented. Missing/weak configuration fails closed. Files: backend/auth.py, backend/main.py, tests/test_security.py, tests/conftest.py, scripts/setup_local.py. Ignored local .env generated; credentials are never printed or embedded in client source. Limits: shared-access identity and in-process sessions; server restart signs everyone out. Protected application layouts are implemented with the Phase 5 shell. Current work: Phase 5.

## Phase 5 complete
Next.js shell, login form, sidebar/header and all requested routes implemented with server-side session validation. Browser checks passed: unauthenticated redirect, valid login, every navigation link, mobile menu/no page overflow, logout and no page errors. TypeScript and ESLint passed (one intentional full-navigation-on-expired-session warning; a full navigation clears protected client state). Screenshots inspected at desktop/mobile sizes. Files: frontend/app, frontend/components, frontend/lib/{server,api,utils}.ts, frontend/next.config.ts, frontend/tests/shell.mjs. Limits: New Clean, History and Exports are phase-appropriate placeholders; no significant motion yet. Current work: Phase 6.

## Phase 6 complete
Browser acceptance passed: CSV selection/upload, metadata and suggested column, changed rule and company limit verified in the actual request payload, processing start, pasted input and mobile overflow check. TypeScript and ESLint passed. Files: frontend/components/{new-clean,cleaning-settings}.tsx; frontend/lib/{cleaning-options,types}.ts; frontend/tests/workflow-input.mjs; styles. Limits: starting currently shows confirmation only; detailed progress arrives in Phase 7. Mandatory empty/syntax/duplicate protections cannot be disabled. Current work: Phase 7.


## Phase 7 complete
Real 100,000-row browser acceptance passed: live progress appeared and transitioned automatically to completion. Duplicate-start prevention is covered by API tests and disabled UI submission. TypeScript and ESLint pass. Files: frontend/lib/use-job.ts; frontend/components/job-details.tsx; frontend/app/(workspace)/jobs/[id]/page.tsx; frontend/tests/progress.mjs. Limits: stages truthfully describe the streaming pass rather than simulating a sequence of global stages. Completed results are a minimal summary until Phase 8.

## Phase 8 complete
Results dashboard uses actual totals and prioritizes Clean = VALID + CORRECTED after final filtering. Status tabs, search, status/category/exact-domain filters, 50-row pagination, empty/error states and full record audit dialog implemented. Browser test passed against 125 known records: 121 valid, 1 corrected, 2 removed, 1 review, 122 clean. Mobile overflow found and fixed by containing the accessible table header label. TypeScript/ESLint pass. Files: frontend/components/results.tsx; frontend/lib/use-results.ts; frontend/tests/results.mjs and helpers.mjs; styles. Limit: exact domain filtering (no partial-match domain search; general email search is available). Current work: Phase 9.

## Phase 9 complete
Before/after visualization uses real summary/category counts: total versus clean, duplicate/invalid/junk/asset/domain-limit removals and repairs. Browser assertions match the known fixture. Repairs retain their audit meaning even for subsequently removed rows. No deliverability score or mailbox-existence claim is shown. TypeScript and ESLint pass. Files: frontend/components/list-health.tsx; frontend/tests/health.mjs; results integration and styles. No new limitations. Current work: Phase 10.

## Phase 10 complete
Browser-tested all six CSV downloads and XLSX full report; counts match UI, clean output has unique final emails and excludes removed/review. Primary Clean List CTA works. Download failures are surfaced in the app. Files: frontend/lib/download.ts; frontend/components/export-downloads.tsx; frontend/tests/downloads.mjs. Limits: browser assembles download blobs in memory; backend exports stream from disk. CSV spreadsheet formula protection is documented; XLSX keeps literal cell strings. TypeScript/ESLint passed. Current work: Phase 11.

## Phase 11 complete
Framer Motion added for file entry, progress width, stage text, completion and count animation; professional 150–400 ms timing, restrained hover lift, drag feedback and readable text colors. Reduced-motion browser test passes and table remains limited to 50 records. TypeScript/ESLint pass. Files: frontend/components/{motion-provider,animated-number}.tsx; upload/progress/results components; frontend/tests/motion.mjs; styles. No new limitations. Current work: Phase 12.

## Phase 12 complete
123 Python tests passed; browser history/overview/export-center/settings checks passed. History shows counts, status and local time, can be searched, and reopens retained jobs. Overview totals aggregate completed cleans; export center chooses a completed job. No durable raw-list history was introduced. Files: backend/jobs.py and main.py; frontend/components/{history,export-center,settings}.tsx; frontend/lib/use-resource.ts; frontend/tests/history.mjs. Limitation: history and sessions reset on backend restart; result files remain subject to retention. Current work: Phase 13.


## Phase 13 complete
155 Python tests, TypeScript, ESLint, production build and a real 100,000-row browser job passed. Benchmarks completed at 1k/10k/50k/100k with clean uniqueness/count/domain-limit assertions; see docs/PERFORMANCE.json. At 100k: 19.64 MB peak traced Python allocations, 66.61 MB peak process working set, 53.255 s with tracing enabled, 1.353 s clean CSV export. Tracing adds overhead; these are local measurements, not an SLA.
Hardened streamed body limits, pre-parser upload authentication, XLSX archive/XML handling, atomic job reservations, failed-input cleanup, atomic exports with download leases, bounded result reads, owned-directory expiration and startup/orphan cleanup. Retention runs every 60 s, skips active jobs/downloads, and removes expired inputs/results/exports. Query request logging disabled to avoid retaining searched addresses. Added custom-cap/all-extension/high-entropy regression coverage. Files: backend/{security,jobs,main,config}.py; engine/{files,system_detector}.py; tests/test_hardening.py; scripts/benchmark.py; frontend/next.config.ts. Limits: one API process, two concurrent jobs, 100 retained jobs, 25 MB/100k-row input caps; configured retention 1–168 hours.


## Phase 14 complete
All final acceptance checks passed on September 14, 2026: 155 Python tests; Ruff lint/format; Python dependency consistency; TypeScript; ESLint with zero warnings; Prettier; optimized Next.js production build; and all nine browser scripts against production mode. The complete CSV/TXT/XLSX workflow verified column/rule configuration, real processing, corrected/removed/review inspection, all six CSV and XLSX downloads, clean uniqueness/status exclusions, company caps, public-provider exemptions, history, mobile layout and logout. A real 100,000-row browser job completed with live progress. Release checks recorded no browser errors or external list-data requests.
Windows launch helpers passed readiness, safe stop and restart checks. Startup retention removed expired marked jobs; verified legacy synthetic QA data was also cleared. The generated local password/session secret are absent from nonignored source; .env, .runtime and .data remain ignored.
Files: docs/QA_REPORT.md, README.md, docs/PHASE_0_QA.md, .env.example (reviewed), scripts/{check.py,start-local.ps1,stop-local.ps1}, tests/fixtures/acceptance.{csv,txt,xlsx}, frontend/tests/*.mjs, frontend/app/{icon.svg,layout.tsx}, frontend/next.config.ts and formatted frontend sources. Important setup, access, rule extension, company limits, privacy/retention and private deployment instructions are documented. Known limitations are listed in the QA report; no local v1 acceptance work remains. The app is running locally in production mode at http://127.0.0.1:3000.

## Subsequent deployment guidance
Added docs/NETLIFY_DEPLOYMENT.md, root netlify.toml and the locally installed pnpm 11.19.0 packageManager pin in frontend/package.json. Validated TOML/JSON and referenced project paths. The guide covers private GitHub publishing, Netlify build settings, Render Python setup, origin/secret configuration, small-file acceptance and custom-domain DNS. These are documentation/build-configuration changes; no live Netlify/Render deployment has been verified. The guide uses cloud-only 3 MB / 1,000-row test caps and explicitly leaves full-size upload/download routing plus hosted acceptance outstanding. Local Phase 14 completion and local runtime limits are unchanged.

## Browser-only migration (2026-09-15)
- Phase 1 complete: audited all frontend/backend and authentication dependencies in docs/BROWSER_ONLY_MIGRATION.md. No runtime changes. Authentication will be removed completely per the overriding request.

- Phase 2 complete: typed file, processing, results, history and export services isolate transport from cleaning UI. Temporary backend adapters preserve the runnable application; TypeScript check passed. No auth service is introduced.

- Phase 3 complete: browser File parser and parsing worker added for CSV/TXT/XLSX, preserving header overrides, column suggestions, blanks, row order and resource limits. Existing adapter remains runnable until local processing is connected.
- Phase 4 complete: IndexedDB jobs, source rows, result batches and preferences added with browser-generated UUIDs, timestamps, durable metadata and explicit failure handling. No user identity in the local model.

- Phase 5 complete: real TypeScript cleaner runs in a dedicated worker; 500-row durable batches drive progress events instead of polling. Local parsing and local jobs now connected. Cancellation and interrupted-tab failures included. Existing result adapter will switch to IndexedDB in phase 6.

- Phase 6 complete: results and filters read local IndexedDB batches in a worker; superseded queries are cancelled.
- Phase 7 complete: all six CSV/XLSX exports generated locally in a worker using original schemas, formula-safe CSV and literal XLSX cells. Clean export includes unique retained VALID + CORRECTED only.
- Phase 8 complete: overview/history/export selection use IndexedDB metadata with event-driven updates across tabs. History persists on the same browser/device.

- Phase 9 complete: dashboard opens without login; shell has no account/avatar/logout; Settings now saves local cleaning/export defaults and offers clear local data. Browser-only security documented.
- Phase 10: runtime UI no longer calls backend services or loads root environment configuration. Obsolete proxy/client files retained unused until phase 14 validation.
- Phase 11: Netlify configuration retains frontend / pnpm build / .next; production validation in progress.

- Phase 12 complete: original screens, light theme, navigation, rule controls, list health, result tables and animations retained; authentication is intentionally absent. Visual QA follows in final regression.
- Phase 13 complete: Python/TypeScript parity (6,276 records), production build and browser-only acceptance passed, including 100,000 rows, no data/auth network requests or cookies, local persistence/export/cancellation/interruption/clear data with port 8000 closed.
- Phase 14: removed obsolete frontend proxy/auth/client/download/resource modules and superseded backend-dependent UI tests after browser-only tests passed. Python implementation retained. Final regression and package preparation in progress.

- 2026-09-16 final completion: phases 10–14 fully verified after cleanup. `pnpm build` succeeds with the persistent pnpm workspace hoisting setting and no proxy route. TypeScript, ESLint and Prettier pass. All browser regression scripts pass on the final production build, including status/results/health/downloads/history/mobile/reduced-motion coverage. Added browser-only QA report and updated source packaging. No live Netlify deployment was performed.
