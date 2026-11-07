# NAMANA.PRO

NAMANA Studio builds personal websites from the approved ORIGINAL CSS 3D wallet/card renderer. This checkout is the NAMANA product, separate from PESONAFLIX and BADAI production.

## Development

Node 24 / npm 11 were validated. Use the existing isolated checkout; no extra worktree is needed.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Configure the existing NAMANA Supabase/Vercel services using [RELEASE_SETUP.md](RELEASE_SETUP.md). `.env.example` contains variable names only. Without backend configuration the landing/demo work and authenticated features display an explicit configuration message. Production never uses test fixtures or local-only draft persistence.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Unit/integration tests execute the SQL migration with PostgreSQL roles and RLS in PGlite. Browser tests use Chromium at `/usr/bin/chromium`, real SQL/RLS, controlled Auth fixtures and a local multipart transport. They do not certify hosted Supabase Auth/Storage, email delivery, Safari/Edge or Vercel deployment. Test-only URLs and public keys are injected only in `playwright.config.ts`.

## Application

- `/`: NAMANA landing; `/demo`: original approved example.
- `/login`, `/auth`: invited-user login and password setup/reset.
- `/dashboard`: own website, status, URL and account settings.
- `/studio`, `/studio/sites/:siteId`: visual editor, true desktop/mobile viewport, card CRUD/reorder, media, autosave/conflicts, undo/redo, private preview, publish and restore.
- `/admin`: server-authorized client/site operations, invitation, provisioning, suspension, template/quota settings and audit summaries. Commerce remains disabled.
- `/:slug`: last published snapshot; `/preview/:token`: revocable one-hour preview.

All private table reads use RLS. Writes use owner/admin-checked PostgreSQL functions; publish makes an immutable snapshot and updates the public pointer atomically. Uploads remain private and unverified until the server checks actual content, size, dimensions and MP4 duration. Server keys are never imported by frontend modules. Media remains available for restoring old versions; there is no destructive delete UI.

[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) records source identity and architecture. [QA_REPORT.md](QA_REPORT.md) records verified results, visual evidence and launch blockers. Nothing in this checkout authorizes production go-live.
