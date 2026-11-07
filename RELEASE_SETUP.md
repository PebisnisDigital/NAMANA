# Connect the existing NAMANA services

No remote database migration, project creation, Vercel deployment, DNS change or production change has been performed. Local test Auth/Storage transports are fixtures, never a fallback enabled in the application.

## Confirm the projects

1. In Supabase Dashboard select the existing **NAMANA** project. Under Project Settings / General copy its project reference and confirm the organization. Under Data API / API Keys obtain its project URL and public anon key. Keep key values in settings, not chat or Git. Do not select PESONAFLIX or BADAI.
2. In Vercel open the existing project owning **namanapro.vercel.app**. Under Settings / General identify its project/team, and under Git confirm `PebisnisDigital/NAMANA`. Do not import a new project or reconnect a PESONAFLIX project. The feature branch is `feat/namana-studio-mvp`.
3. The cloud instance currently has no Supabase/Vercel variables, no `.env` or `.vercel/project.json`, and no Vercel login. Git read works, but GitHub deployment API and the supplied live reference are blocked by outbound policy. Add required destinations in environment network settings: `api.github.com`, `api.vercel.com`, `namanapro.vercel.app`, the exact supplied reference hostname, and the verified `<project-ref>.supabase.co`. Add the actual generated Preview hostname after it is known. Never replace an unknown allowlist.

## Environment values

In the existing Vercel project's Settings / Environment Variables, set values for **Preview** first:

| Variable | Source / scope |
| --- | --- |
| `VITE_SUPABASE_URL` | Verified NAMANA project URL, browser-safe |
| `VITE_SUPABASE_ANON_KEY` | NAMANA public anon key; not the service key |
| `SUPABASE_URL` | Exactly the same NAMANA project URL, server |
| `SUPABASE_SERVICE_ROLE_KEY` | NAMANA secret service role key, server only; never use a VITE_ prefix |
| `APP_ORIGIN` | Exact HTTPS origin of the verified NAMANA Preview deployment |

Use the same variable names in secure cloud environment settings to enable integration checks here. Values must be present in the actual running environment, not merely declared in an unpublished draft. No secret is needed in Git. `.env.example` lists names only. The server rejects mismatched frontend/backend URLs.

## Additive database setup

After project identity and existing schema are inspected, apply `supabase/migrations/202611070001_namana.sql` with the project's migration tooling or SQL Editor. It creates only `namana_*` entities, a new `namana-media` private bucket, namespaced functions/policies, and a profile trigger on Auth users. It does not replace tables or drop existing data. Inspect for namespace/bucket conflicts before applying; do not blindly replay it. It has been executed against disposable PostgreSQL/PGlite locally, not against hosted NAMANA.

Bootstrap the first superadmin only through trusted SQL Editor, after creating/inviting that verified account in Supabase Auth. Use the actual user UUID locally in the dashboard:

```sql
insert into public.namana_profiles(user_id,email)
select id,email from auth.users where id = '<verified-admin-user-uuid>'::uuid
on conflict(user_id) do nothing;
insert into public.namana_roles(user_id,role)
values ('<verified-admin-user-uuid>'::uuid,'superadmin');
```

Never assign roles through editable user metadata. Existing Auth users are not automatically granted any role. Other existing clients can be provisioned with a profile entry through trusted administration; do not alter or delete existing users.

## Auth and email

In Supabase Authentication / URL Configuration, set Site URL to the verified Preview origin while testing and add `<preview-origin>/auth` to Redirect URLs. Add `https://namanapro.vercel.app/auth` only for the intended production setup. Disable public signups for invitation-only MVP. Configure the project's SMTP provider, sender identity, and production email rate limits. Verify invitation and reset email delivery with controlled test inboxes.

The invitation API issues a server-side invitation, creates a NAMANA profile, and records an audit event. Website provisioning is a separate transaction: if it fails, the invited account remains recoverable and can be provisioned later. No fake paid/order status is created. Resend access uses password reset to the same verified callback.

## Preview and final QA

Once the correct Vercel project binding is confirmed, push the feature branch and use that project's **Preview** workflow or `vercel deploy` with its existing linked project. Do not pass `--prod`. Set APP_ORIGIN to that Preview URL, add its Auth callback, redeploy Preview if necessary, and run all hosted acceptance cases with two controlled clients and the superadmin.

Uploads go directly to a private bucket, then server verification inspects actual MIME, dimensions, bytes, H264 MP4 track and duration before the asset may be saved/published. Default limits are technical test defaults (5 MiB images, 20 MiB videos, 100 MiB/site, 120 seconds, 3840 px), configurable in Admin within tested server bounds. No transcoding is implemented. Pending uploads can be cancelled; verified historical media must remain until an explicit retention policy is approved. Signed delivery URLs expire after five minutes and are refreshed while the page stays open. Revoking preview does not revoke already issued media URLs before that expiry.

Run `npm ci --cache /workspace/.npm-cache`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Browser tests use Chromium installed at `/usr/bin/chromium`; hosted tests must additionally use real Supabase Auth, Storage and Vercel routes. Check Safari/Edge, touch, video failure, long content, quota errors and all callbacks.

## Production gate and rollback

Production is blocked until hosted two-user isolation, email/upload/publish/restore, live ORIGINAL comparison, Vercel routing/headers and mobile QA pass. Finalize public support/contact and commercial privacy/terms before accepting payment. Take a database backup using the project's supported backup tools and verify the recovery procedure. Request the owner's single final go-live approval only after presenting the verified Preview result. Do not treat the local build or this document as that approval.

Rollback an application release through Vercel's previous deployment while retaining the database and immutable published snapshots. No automatic destructive down migration or data deletion is supplied. Restore a site version into draft and republish through checked server RPCs rather than rewriting history.
