# Browser-only architecture

Netlify serves the Next.js application. The browser parses files, creates local jobs, cleans records, saves results and generates downloads. No application authentication or separate backend exists.

## Components and boundaries

| Layer | Responsibility |
| --- | --- |
| Next.js routes and existing React components | Dashboard, New Clean, progress, results, List Health, exports, history, settings and help |
| `lib/services/contracts.ts` | Typed processing, file, result, export and history boundaries |
| `workers/file-reader.worker.ts` | Read File bytes, parse CSV/TXT/XLSX, inspect columns and save a ready job |
| `lib/engine/cleaner.ts` | Deterministic normalization, correction, rejection, duplicate and company-domain decisions |
| `workers/email-cleaner.worker.ts` | Run the real engine, save 500-record result batches, publish progress and completion/errors |
| `workers/report.worker.ts` | Local result filtering/pagination and CSV/XLSX generation away from the UI thread |
| `lib/services/storage.ts` | IndexedDB jobs, inputs, results and preferences |
| `lib/services/events.ts` | Local subscriptions and cross-tab notifications; no server polling |
| Browser Web Locks | Prevent duplicate runs, detect abandoned processing and protect active jobs from clearing |

Next.js can render page shells at Netlify, including a job route containing an opaque local UUID. Email data is never passed to route handlers or server components. The old `/api` proxy is removed. The root route and the compatibility `/login` route both lead directly to the dashboard.

## State and storage

Jobs keep the original UI field names to avoid changing presentation. `filename`, `created_at`, `updated_at`, `total`, `processed`, `stage`, `counts`, `summary`, `state` correspond to file name, timestamps, row totals, processing stage, status counts and lifecycle. Progress percentage is derived from processed/total. Clean count is VALID + CORRECTED. `ProcessingProgress` carries explicit camel-case worker counters and percentage. IDs come from `crypto.randomUUID()` with no user identity.

Before a job exists, New Clean has an idle/reading state. Durable jobs move through `ready → processing → complete` or `failed`. The ready state preserves email-column selection. Result batches and each progress snapshot commit together. Completion commits the final summary and deletes source rows. Abandoned ready inputs are discarded when their screen releases them. Failed/cancelled runs discard partial results and source rows. Reloaded processing jobs are marked failed after their worker lock disappears; completed history remains.

IndexedDB database `veriforge-browser` version 1 stores:

- `jobs`: metadata, options, progress and final summary, keyed by UUID.
- `inputs`: parsed source rows while preparing/processing, keyed by job UUID.
- `results`: 500-row batches keyed by `[jobId, batch]`, preserving every original record field.
- `preferences`: default cleaning options and export format.

History is metadata from jobs, without account IDs. No email dataset is placed in localStorage. The same origin/browser profile shares history across tabs. Clear local data is explicit and blocked while a clean is active.

## Cleaning and export parity

Rule ordering matches the retained Python implementation. Corrections run before rejection; normalized and final duplicates are checked before company capacity. Numeric-only review records do not consume company capacity. Public providers are exempt only when explicitly listed. `.co` is never globally rewritten. The correction trail survives later removal or review. All source strings and logical data-row numbers are preserved.

CSV exports have a UTF-8 BOM, matching column schemas and formula-prefix protection. XLSX stores literal strings, including formula-looking originals. Clean List is unique retained VALID + CORRECTED only. No network deliverability checks are added.

Python sources under `engine/` and `backend/` remain legacy/reference code. Engine goldens and rule-drift checks guard the TypeScript port; retained Python tests continue to describe historical backend behavior, not current deployment requirements.
