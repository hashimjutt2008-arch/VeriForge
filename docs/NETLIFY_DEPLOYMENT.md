# Deploy VeriForge with Netlify — beginner guide

This version needs **Netlify only**. You do not need Render, a Python service, a backend URL, or application login credentials.

## 1. Put the complete project on GitHub

1. Extract the new VeriForge browser-only source ZIP on your computer.
2. Open your VeriForge GitHub repository. Use GitHub Desktop to replace the project files while preserving folders, then commit and push to `main`. If using GitHub's **Add file → Upload files**, upload folders in manageable batches; do not flatten their contents into the root.
3. Confirm the root contains `netlify.toml` and a **frontend folder**. Open that folder and confirm it contains `package.json`, `pnpm-lock.yaml`, `app`, `components`, `lib` and `workers`.
4. Make sure obsolete files removed in this version are also removed from GitHub: `frontend/app/api`, `frontend/components/login-form.tsx`, `frontend/lib/api.ts`, `frontend/lib/server.ts`, `frontend/lib/download.ts`, and `frontend/lib/use-resource.ts`. Replacing files through a browser upload does not automatically delete old files. GitHub Desktop makes these deletions easier to review.
5. Never upload `.env`, `.runtime`, `.data`, `.venv`, `node_modules`, `.next` or credentials. The source archive excludes these. Previously committed secrets remain in Git history; rotate them wherever they were reused.

The retained `backend` and `engine` folders are reference code only. You do not deploy them.

## 2. Create or reconnect your Netlify project

1. Sign in to [Netlify](https://app.netlify.com/).
2. Choose **Add new project → Import an existing project** (some accounts label this **Add new site**).
3. Choose **GitHub**, authorize access if prompted, and select your VeriForge repository.
4. Choose the production branch **main**.
5. Confirm these build settings:

| Field | Value |
| --- | --- |
| Base directory | `frontend` |
| Build command | `pnpm build` |
| Publish directory | `.next` |

The repository's `netlify.toml` already sets these values. Do not enter `frontend/frontend` or change the publish directory to `out`.

6. No VeriForge environment variables are required. Remove old `VERIFORGE_BACKEND_URL`, username, password and session settings from this Netlify project if you added them for the previous version.
7. Click **Deploy**. Netlify installs dependencies and builds Next.js. Its Next.js integration serves the application. Netlify documents the standard `.next` publish directory in its [Next.js configuration reference](https://docs.netlify.com/snippets/frameworks/nextjs-config-values/).

If you already have a Netlify project, open **Project configuration → Build & deploy** and connect its repository if it was created by manual upload. Confirm the same settings, then open **Deploys → Trigger deploy → Deploy project**. If configuration changed and a cached build fails, retry with the clear-cache deployment option.

## 3. Check the published app

1. Wait until the production deploy says **Published** and open its Netlify URL.
2. The dashboard must open directly, with no login screen.
3. Choose **New clean → Paste emails**, enter a small list, choose the column and start cleaning.
4. Check the four status groups and download the clean list.
5. Reload and open History. That clean should still be available in the same browser.

Do not use Netlify's manual drag-and-drop static deployment for the source ZIP or `.next` build folder. This project uses Next.js and the requested `.next` output, so Netlify must run its repository build/integration. A source upload alone can produce the earlier Page not found error.

## 4. Share with your team or add a domain

Share the published HTTPS URL. Each teammate can process files locally and has separate browser history. They do not need an account inside VeriForge.

To add your domain, open the project's **Domain management**, choose **Add a domain**, and follow Netlify's DNS instructions for the records shown for your project. Wait for DNS and HTTPS provisioning before sharing the custom-domain URL. Settle on one URL: moving from a Netlify subdomain to a custom domain creates a different browser-storage origin, so old history does not automatically move.

The site has no application password protection. If access should be restricted, configure hosting-level access controls offered by your plan. Do not put a shared password into frontend JavaScript.

## Common problems

- **Base directory does not exist: frontend**: the repository is missing the frontend folder, or it was nested inside an extra ZIP folder. At the repository root, `frontend/package.json` must exist.
- **Page not found**: check that you imported the GitHub repository and that the build succeeded. Do not manually upload raw source as a static site.
- **Build failed**: open the failed deploy and copy the first actual error from its build log. The initialization/cache summary alone is not enough to diagnose it.
- **History is empty**: check the browser, profile and exact domain you used. There is no shared server history.
- **Cleaning stopped after reload**: keep the tab open until completion; start a new clean from the original input.
- **Browser storage is full**: download important results, then use Settings → Clear local data and retry.

## Fix: Published deploy, but every page returns Netlify's 404

On 2026-09-16, the live `veriforge1.netlify.app` deployment returned 404 for `/`, `/dashboard` and `/new`, while `/server/app/dashboard.html` and `/BUILD_ID` returned 200. This confirms raw Next.js build files were published without working application routing. The dashboard's internal HTML path is diagnostic evidence, not the website address to share.

The source now explicitly declares `@netlify/plugin-nextjs` in root `netlify.toml` and frontend development dependencies, and sets `NETLIFY_NEXT_PLUGIN_SKIP` to `false`. Keep base `frontend`, command `pnpm build`, publish `.next`.

1. If you manually uploaded a build folder/ZIP, connect the complete GitHub source repository and run a Netlify build instead. Manual static uploads do not run build plugins.
2. If using GitHub, update root `netlify.toml`, `frontend/package.json` and `frontend/pnpm-lock.yaml` from the corrected source package. Commit to the production branch.
3. In Netlify Project configuration → Environment variables, remove any old `NETLIFY_NEXT_PLUGIN_SKIP=true` or `1` setting. Do not add credentials or backend URLs.
4. Open Deploys → Trigger deploy and choose the clear-cache deployment option.
5. The build log should show `@netlify/plugin-nextjs` running, not a message that the plugin was skipped. Verify the latest deploy is Published, then open `/` and `/dashboard`.

Alternatively, for a repository-connected project without the corrected source files yet, Netlify documents enabling framework plugins under Project configuration → Build & deploy → Build plugins. Enable Next.js, ensure it is not skipped by an environment variable, and trigger a new build.

Official references: [Next.js adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) and [build-plugin installation](https://docs.netlify.com/extend/install-and-use/build-plugins/).
