# VeriForge

Email-list cleaning and conservative correction with a complete audit trail. Open the app directly: no account, login or separate backend is required.

Your email lists are processed locally in your browser and are not uploaded to VeriForge servers.

**Clean List = unique VALID + CORRECTED emails after final deduplication and company-domain filtering.** Removed and review records are excluded. VeriForge does not verify mailbox existence, query DNS/SMTP, send emails or call external verification services.

## Run locally

Install Node.js 22+ and pnpm 11, then open a terminal in this project's folder:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Open [VeriForge locally](http://127.0.0.1:3000). No `.env` file or VeriForge-specific secrets are needed. For development, use `pnpm dev`. Windows users can also run `scripts/start-local.ps1 -Production` after building and `scripts/stop-local.ps1` to stop this checkout's processes.

## Publish with Netlify

Follow the [beginner deployment guide](docs/NETLIFY_DEPLOYMENT.md). Upload the complete source folders to GitHub and connect that repository to Netlify:

| Setting | Value |
| --- | --- |
| Base directory | `frontend` |
| Build command | `pnpm build` |
| Publish directory | `.next` |
| Production branch | `main` |
| VeriForge environment variables | None |

The root `netlify.toml` supplies these settings. Netlify handles Next.js hosting; all file parsing, cleaning, report queries and exports run in the browser. Do not drag a source ZIP or `.next` folder into Netlify's manual static upload area. Use the repository build workflow.

## Use the app

1. Open **New clean**. Choose CSV, TXT or XLSX, or paste one address per line.
2. Select the email column and confirm the preview. CSV accepts comma, semicolon, tab and pipe separators. TXT has no header. XLSX uses its first worksheet. Override CSV/XLSX header detection before choosing a file when needed.
3. Choose rules and a company-domain limit (default 2). Free-provider domains remain exempt. Start cleaning and keep the tab open until it finishes.
4. Review Valid, Corrected, Removed and Review records; inspect original/normalized/final values and every reason.
5. Download Clean List, Valid, Corrected, Removed, Review or Full Report as CSV or XLSX.
6. Reopen previous cleans from History. Settings saves default rules and export format and can clear local data.

Limits: 25 MB input, 100,000 rows, 256 columns, 4,096 characters per cell, 128 MB expanded XLSX archive. Parsing, cleaning and report generation run in Web Workers. Large results are stored in IndexedDB, never localStorage.

## Local history and access

History belongs to the current browser profile and website origin. It does not sync to your team or another device. Keep downloaded copies of important reports: clearing browser data, private browsing, storage eviction or moving to a different domain can make history unavailable. Reloading or closing a processing tab interrupts that clean; completed jobs remain available.

VeriForge has no application access control. Anyone who can reach the site can open it. Use hosting-level access restrictions if your team needs them. A private source repository alone does not restrict a published website. See [browser-only security](docs/BROWSER_ONLY_SECURITY.md).

## Architecture and maintenance

Netlify → Next.js application → browser services → TypeScript engine in Web Workers → IndexedDB → local Blob downloads.

The frontend preserves the original light theme, navigation, cleaning controls, progress, status tabs, List Health, audit records and animations. The login screen and account controls are intentionally removed.

- Browser implementation: `frontend/lib/engine`, `frontend/lib/services`, `frontend/workers`.
- Cleaning rule source: `rules/*.json`; bundled snapshot: `frontend/lib/engine/rules.json`. Update both together; parity tests detect drift.
- `engine/` and `backend/` are **legacy/reference Python implementations** retained for parity testing. They are not run or deployed by the application.
- Migration audit: [BROWSER_ONLY_MIGRATION.md](docs/BROWSER_ONLY_MIGRATION.md).
- Verification: [BROWSER_ONLY_QA.md](docs/BROWSER_ONLY_QA.md).

From `frontend`:

```powershell
pnpm typecheck
pnpm lint
pnpm test:engine
pnpm test:browser
```

Browser tests require the built app running locally and Microsoft Edge (or set `VERIFORGE_TEST_BROWSER=chrome` for Chrome). The browser-only test verifies port 8000 is closed. Engine golden tests require no Python installation.

To regenerate goldens against the retained Python reference, install the locked Python development dependencies and run `python scripts/browser_parity.py` from the root. It captures the original engine test cases plus all rule switches, rule data and additional edge cases. Do not change goldens to hide parity failures.
