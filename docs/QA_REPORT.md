> Historical Python-backed release record. Superseded by [browser-only QA](BROWSER_ONLY_QA.md) and the current root README.

# VeriForge v1 release QA

Release verification completed on September 14, 2026, on this Windows checkout. Phases 0–14 are complete. This is a locally running Python/FastAPI and Next.js application; no hosted deployment was created.

## Automated checks

| Check | Result |
| --- | --- |
| Python engine, files, API, authentication and hardening tests | 155 passed |
| Ruff lint and formatting | Passed; 38 Python files formatted |
| Installed Python dependency consistency | Passed |
| TypeScript | Passed |
| ESLint, with zero warnings allowed | Passed |
| Prettier source/configuration checks | Passed |
| Optimized Next.js production build | Passed |
| Windows production start, readiness, stop and restart | Passed |
| Expired owned-job cleanup at startup | Passed |
| Source scan for the generated password and signing secret | Passed; credentials and job data are Git-ignored |

The Python test run reports two non-fatal dependency deprecation warnings: Starlette's httpx TestClient integration and its AnyIO BlockingPortal alias. ESLint 9 and TypeScript 6 are pinned for compatibility with the installed Next.js tooling.

## Browser acceptance

All nine scripts in `frontend/tests` passed against the local production server using Microsoft Edge:

| Script | Verified behavior |
| --- | --- |
| shell.mjs | Protected redirect, sign-in, every navigation route, mobile menu/layout and logout |
| workflow-input.mjs | CSV upload, column suggestion, changed rule/company-cap payload and pasted input |
| results.mjs | Actual counts, status tabs, original/correction audit, search, reason/domain filters and pagination |
| health.mjs | Before/after and category counts agree with processed records |
| downloads.mjs | All six CSV exports, XLSX, primary clean download and clean-list invariants |
| motion.mjs | Reduced-motion behavior, settled animated counts and bounded table rendering |
| history.mjs | History search/reopen, overview totals, export selection and configuration display |
| progress.mjs | Real 100,000-row input, live progress and automatic completion |
| release.mjs | Full CSV/TXT/XLSX workflow, all exports, record inspection, history, responsive layout and logout |

The release workflow signs in, uploads each supported file type, chooses the email column, sets the company maximum to two, processes the list, inspects corrected/removed/review records, and downloads all six export types in both CSV and XLSX. The 16-row fixture produces **7 valid, 3 corrected, 5 removed, 1 review and 10 clean** records.

Clean CSV downloads contain unique final addresses, exclude removed/review records, preserve a legitimate .co address, include conservative repairs, limit retsy.com to two entries, and retain all three Gmail entries. Original values and repair reasons remain visible in record details. Python tests additionally verify XLSX cell contents and export counts.

Release assertions recorded no browser page/console errors and no requests outside the local application origin during the tested cleaning/export workflow. Desktop (1440 px) and mobile (390 px) screenshots were visually reviewed; no horizontal page overflow was detected. Screenshots are local QA artifacts in ignored `.runtime`.

## Performance and privacy

The Phase 13 benchmark covered 1,000, 10,000, 50,000 and 100,000 synthetic records in separate processes. Each run verified unique clean output, company-domain limits and exported row counts. Detailed measurements are in [PERFORMANCE.json](PERFORMANCE.json).

At 100,000 rows, the recorded benchmark used 19.64 MB of peak traced Python allocations and 66.61 MB peak process working set; processing with allocation tracing took 53.255 seconds and clean CSV export took 1.353 seconds. Tracing adds overhead; these measurements are not a service guarantee. The production browser test separately confirmed real 100,000-row completion.

The engine makes no DNS, SMTP, mailbox-verification or external API calls. Source uploads are removed after processing; temporary audit reports and exports expire. On final startup, all four expired marked QA jobs from the prior session were removed by the app. Twelve expired synthetic QA directories from before ownership markers were introduced were separately checked and removed.

## Operating limits

- One FastAPI process, two concurrent processing tasks and at most 100 retained jobs.
- Maximum input size 25 MB and 100,000 rows.
- Default temporary retention and session duration: 12 hours. Cleanup runs every 60 seconds while the backend is running.
- Sessions and history reset on backend restart; files from prior sessions remain subject to retention.
- Curated starter rule lists, exact-hostname company caps, ASCII dot-atom address syntax and first-worksheet XLSX import.
- CSV formula-risk cells receive an apostrophe; XLSX stores literal strings.
- The browser assembles downloads as blobs. Temporary files are protected by host filesystem permissions, not application encryption.
- Private HTTPS deployment requires a chosen host/origin and the setup described in [README.md](../README.md).

No release-blocking issue remains within the requested local v1 scope. See [BUILD_PROGRESS.md](../BUILD_PROGRESS.md) for the phase-by-phase implementation history.

