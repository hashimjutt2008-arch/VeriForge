# Browser-only migration

The second request supersedes the original authentication phase: remove application authentication completely. Keep the existing design and Python implementation as a parity reference.

## Phase 1 audit (2026-09-15)

| Dependency | Location | Existing behavior | Browser replacement | Status |
| --- | --- | --- | --- | --- |
| HTTP client / 401 redirects | frontend/lib/api.ts | Fetches /api; sends users to login | Typed services and local error utility | Complete |
| Python proxy and URL | frontend/app/api/[...path]/route.ts | Forwards files, cookies, JSON and exports to FastAPI | Remove after local replacements pass tests | Complete |
| Root environment loading | frontend/next.config.ts | Loads root .env including backend settings | No environment loading | Complete |
| Access guard | frontend/lib/server.ts; app/(workspace)/layout.tsx | Validates backend session before rendering | Unconditional application shell | Complete |
| Account UI | app/login/page.tsx; components/login-form.tsx; components/shell.tsx | Login, username, logout and session redirects | Dashboard entry, no accounts | Complete |
| File upload and metadata | components/new-clean.tsx | POST upload/paste returns server job and metadata | File API, parsing worker, local metadata | Complete |
| Job creation / processing | components/new-clean.tsx | Server ID and POST process | crypto.randomUUID, IndexedDB, worker | Complete |
| Job progress | lib/use-job.ts; components/job-details.tsx | GET every 750ms | Worker events and local subscriptions | Complete |
| Results / filters | lib/use-results.ts; components/results.tsx | GET paginated report | IndexedDB query worker | Complete |
| Export downloads | lib/download.ts; components/export-downloads.tsx | GET streamed CSV/XLSX | Worker-generated Blob downloads | Complete |
| History / overview / export selection | lib/use-resource.ts; components/history.tsx; components/export-center.tsx | GET server job list | IndexedDB job metadata | Complete |
| Settings | components/settings.tsx | GET server retention/session/limits | Browser rule/export defaults and clear local data | Complete |
| Privacy / help | components/shell.tsx; components/new-clean.tsx; app/(workspace)/help/page.tsx | Server processing and credential instructions | Truthful browser processing and device-local storage | Complete |
| Test fixtures and launch scripts | frontend/tests; scripts/start-local.ps1 | Requires backend, credentials and HTTP fixture creation | Browser-only workflow tests and frontend launcher | Complete |
| Hosting and README | netlify.toml; README.md; docs/NETLIFY_DEPLOYMENT.md | Separate Python host and secrets | Netlify builds frontend; no application secrets | Complete |

No other middleware or route guard was found. Job paths will retain opaque local IDs, with no user identity. Next.js may serve page shells through Netlify; email data will stay in browser workers and IndexedDB.

## Validation plan

Compare TypeScript records field-for-field with Python goldens, including options, corrections, duplicates, domain limits and rule datasets. Exercise production with Python off and no environment requirements: CSV/TXT/XLSX, paste, column selection, worker progress, all filters and exports, persistent history, cancellation, storage failures, mobile layout and reduced motion. Observe outgoing requests and cookies. Only then delete obsolete frontend transport code and update deployment documentation.

## Phase ledger

1. Complete: dependency audit recorded before runtime changes.
2. Complete: typed file, processing, results, export and history service interfaces; temporary adapters isolated the transition.
3. Complete: browser File parser in a dedicated worker for CSV, TXT and first-sheet XLSX; no file upload API.
4. Complete: local UUID jobs with IndexedDB metadata and inputs, timestamps, state, counters and options. Existing UI field names are retained; see ARCHITECTURE.md for the field mapping.
5. Complete: TypeScript parity engine and START_PROCESSING / CANCEL_PROCESSING worker contract. Real PROGRESS / COMPLETE / ERROR events replace polling. Web Locks prevent duplicate runs and detect interruption.
6. Complete: full original ResultRecord fields persisted in 500-record IndexedDB batches. Filtering and pagination run in a report worker.
7. Complete: six CSV and six XLSX exports generated from local results via Blob URLs. Original schemas and Clean List semantics preserved.
8. Complete: IndexedDB history reopens completed jobs in the same browser/device, including after reload.
9. Complete: all application authentication removed. Root and former login path open dashboard; no account/avatar/logout/guards/cookies. Local settings and clear-data controls replace server settings.
10. Complete: frontend has no backend URL, API client, proxy, file upload/download endpoints or polling. No root .env loading.
11. Complete: requested Netlify base frontend, command pnpm build, publish .next preserved. Production builds without application secrets or Python.
12. Complete: existing light theme, cleaning screens, reports, List Health and animations retained. Desktop and 390px mobile screenshots reviewed; no horizontal overflow.
13. Complete: browser-only checks with port 8000 closed; engine parity, all formats, local exports, worker progress, history persistence, cancellation and interruption. See BROWSER_ONLY_QA.md for final test results.
14. Complete: obsolete frontend transport/auth modules and superseded backend-only browser tests removed after the browser-only acceptance pass. Python sources retained as legacy/reference; README, deployment/security/architecture docs and launcher updated.

Each stage kept the application buildable. Browser components were introduced behind typed service boundaries and then connected in dependency order; full browser acceptance preceded removal of the obsolete transport modules.

## Operational limits

No account or login required. No separate backend required. Files are processed locally in the browser. The host serves application code; it does not receive email-list contents. History does not sync between team members, browsers or website origins. Keep the processing tab open and download important reports. Netlify deployment must build the Git repository; the requested .next configuration is not a raw drag-and-drop static ZIP deployment.

The bundled SheetJS release is pinned to the official distribution, following https://docs.sheetjs.com/docs/getting-started/installation/frameworks/; it is installed at build time, never loaded from a third-party CDN during a cleaning workflow.
