# NAMINA.PRO

NAMINA is a multi-client cinematic website built from one GitHub repository and one Vercel project. The ORIGINAL wallet and 3D card experience is reused for each client's profile. This repository is separate from the existing PESONAFLIX production system.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | NAMINA landing page |
| `/vini` | ORIGINAL cinematic demo with Vini's profile and video |
| `/studio` | Password-protected content editor for the admin team |
| `/:client-slug` | Published client website |

`/demo` redirects to `/vini`. Former Supabase-specific login/admin/dashboard routes redirect to `/studio` for existing bookmarks. Legacy files and SQL migrations remain in Git history but are not used by these routes.

## Content and deployment

NAMINA uses a single Vite app, a shared site-document schema, and dynamic
publication in Supabase. Creating or editing a client's website should not
require a GitHub commit or Vercel build.

1. Admin logs into `/studio` with a server-checked password.
2. Admin creates a client slug from the Vini cinematic template, edits the
   site's content, colors, menu, media URLs and branding, and previews locally.
3. On approval, `POST /api/studio?action=publish` validates the document and
   writes the published version to `namina_published_sites`. A revision token
   prevents accidental overwrites of another Studio edit.
4. Public `/:client-slug` pages fetch the latest published document from
   Supabase. Existing `public/clients/*.json` files remain as read-only
   compatibility fallback. No commit/deploy is needed for client content.
5. Mitra uses Supabase-authenticated workspaces and the
   `namina_business_publish_site` RPC. RLS and workspace ownership must be
   tested against real accounts before production rollout.

**Migration prerequisite:** Apply and verify
`supabase/migrations/20261112_namina_dynamic_publishing.sql` against the
correct existing Supabase project using a reviewed migration workflow.
Do not blindly reapply migrations or overwrite existing customer records.
The repository's migration file is not proof that the hosted database has it.
Check /api/studio?action=readiness from a valid admin session; it reports
database-table accessibility, not a complete end-to-end test.

**Legacy protection:** Optional read-only GitHub access permits Studio to list
and inspect historical `public/clients/*.json` documents and compare their
SHAs before first migration. Without it, new clients can publish dynamically,
while first-time migration of `/vini` is blocked to avoid silently replacing
the original public profile. The shipped Vini JSON remains readable to visitors.

**Media:** Admin and mitra can provide HTTPS media links. Dropbox video
uploads use `/api/dropbox-video` when the server-side Dropbox integration is
configured; test end-to-end upload, direct streamability and rights. Avoid
putting large media binaries in GitHub.

**Hermes:** Hermes Agent should eventually call a permission-scoped NAMINA
Client API/MCP with create draft, update content/media, preview, and publish
operations. GitHub is for evolving the application source, not for creating
each customer website. The agent connector is a planned integration, NOT
included by the dynamic publication migration.

## Environment configuration

Use `.env.example` as a checklist. These settings belong in Vercel's secure
environment configuration; never commit their values:

- `NAMANA_ADMIN_PASSWORD`: unique Studio password, at least 12 characters.
- `NAMANA_SESSION_SECRET`: separate session signing secret of 32+ characters.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: existing
  browser-safe Supabase connection settings (both used by the public UI).
- `SUPABASE_SERVICE_ROLE_KEY`: server-only secret for database publication.
  NEVER prefix this variable with `VITE_` or expose it to an AI agent.
- Optional `NAMANA_GITHUB_TOKEN`: **Contents: Read only** access to the
  NAMINA repo for inspecting historical static JSON during migration.
  The optional repo/branch values are `NAMANA_GITHUB_REPO` and
  `NAMANA_GITHUB_BRANCH`; source deployments remain independently linked
  through Vercel's Git integration.
- Dropbox requires server-side app key, app secret and refresh token.

The cookie is signed, HttpOnly, Secure and SameSite=Strict. Protect the Studio
API with rate limiting and per-user permissions before opening it to external
agents. A shared admin password is not appropriate as a Hermes API credential.

## Local development

Use Node 24 and npm 11:

```sh
npm ci
npm run dev
```

Without the environment variables, the landing page and public demo work. `/studio` explains which configuration is missing. Legacy Supabase services are not needed for the current routing.

## Validation

```sh
npm run lint
npm run typecheck
node --import tsx --test tests/*.test.ts
npm run build
```

A passing build does not certify hosted Supabase migration, RLS behavior,
Dropbox, or deployment health. Test Preview before production. Do not merge
changes solely based on repository-level checks.
