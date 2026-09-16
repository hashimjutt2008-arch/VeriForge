# Browser-only QA — 2026-09-16

The final production application was tested locally with the Python/FastAPI service off (port 8000 closed). No backend URL, application password, username or session configuration is required. Netlify publication itself has not been performed; the source and configuration are ready for the repository build workflow.

## Completed checks

| Check | Result |
| --- | --- |
| `pnpm build` after obsolete route removal | Pass; no /api proxy route in output |
| TypeScript (`tsc --noEmit`) | Pass |
| ESLint | Pass, no warnings |
| Prettier source check | Pass |
| `pnpm test:engine` | Pass: 139 cases, 6,278 records match Python field-for-field |
| Rule JSON drift | Pass: bundled rules match the legacy source datasets |
| Parser parity | Pass: CSV/TXT/XLSX metadata and cleaned values match reference fixtures |
| Export parity | Pass: all six CSV/XLSX schemas and values; CSV formula escaping and literal XLSX cells |
| Input limits / malformed CSV | Pass |
| Retained Python reference tests | 155 passed; two existing dependency deprecation warnings |
| `pnpm test:browser` | All six browser scripts passed against the final production build |

## Browser acceptance coverage

- Direct root-to-dashboard access, compatibility login URL redirects to dashboard, no account fields or auth cookies, all navigation accessible.
- Local paste and CSV/TXT/XLSX import, changed email column, original row mapping and browser preference persistence.
- Actual Web Worker START_PROCESSING and PROGRESS events, counters summing to processed rows, and a complete 100,000-row TXT job with the UI continuing to receive animation frames.
- 100,000 durable local results, 50-row table pagination and a 100,000-email local clean export.
- Four result statuses, exact/literal filters, pagination and original/correction audit dialogs.
- Real List Health totals and category counts.
- Six CSV and six XLSX downloads for each input format; Clean List excludes removed/review/duplicates/excess-domain entries.
- IndexedDB history survives reload, opens in another tab of the same browser profile and can reopen results.
- Cancellation, failed-state recovery after a processing-tab reload, and explicit clear-local-data controls.
- Desktop and 390px mobile layout with no horizontal overflow. Screenshots visually reviewed. Reduced-motion behavior and animated counts verified.
- No application requests to /api or auth endpoints; no outgoing email data or external HTTP requests; no cookies required or created. Edge's internal `edge://` download-manager resources are excluded from network assertions because they are browser UI, not network traffic.
- Source scan confirms no runtime fetch, backend URL, credential, auth-session or logout dependencies in application routes/components/services/workers.

## Test entry points

From `frontend`, with production running at http://127.0.0.1:3000:

```powershell
pnpm test:engine
pnpm test:browser
```

The browser suite runs `browser-only.mjs`, `release.mjs`, `results.mjs`, `health.mjs`, `downloads.mjs`, and `motion.mjs` sequentially. It uses installed Microsoft Edge by default. Engine goldens are committed and require no Python to run. Regenerate with `python scripts/browser_parity.py` only when comparing against the retained Python reference.

## Practical limits

History is browser-profile and origin local, without team synchronization. Keep the processing tab open and download important reports before clearing data or changing the website domain. No application authentication is supplied. Hosting-level access controls are separate. Testing used desktop Edge on Windows; other browsers/devices and a live Netlify domain have not been independently verified in this run. The 100,000-row responsiveness check used file input; very large native textarea insertion can be slower than file selection. Spell checking is disabled for the paste input.
