# NAMINA.PRO — agent instructions for Studio and client websites

NAMINA is a multi-tenant cinematic website service. One Vite application serves many
client slugs. The canonical production repository is PebisnisDigital/NAMINA,
connected to Vercel project `namina`. Do not edit PESONAFLIX production.

## Product rules

- Client website content and style belong to each client's document and are
  published to `namina_published_sites` in Supabase, not written to GitHub.
- Publishing a client must NOT commit `public/clients/*.json` or trigger a
  new Vercel deployment. Legacy files remain read-only fallback.
- The admin Studio is `/studio`, with legacy generator `/studio-v1`.
  Mitra website workspaces use RLS and `namina_business_publish_site`.
- Admin and Mitra must edit the same site-document schema
  (`src/static/sites.ts`), and all changes must remain tenant-isolated.
- Create a draft, preview it, request explicit owner approval, then publish.
  Never publish a customer site merely because draft creation succeeded.
- Protect the existing `/vini` demo and historical site data.
- Client media is referenced via URLs; Dropbox uploads have their own API.
  Preserve muted autoplay, looping video, loading behavior and editable logos.

## Hermes Agent operating boundary

Hermes is intended as an operator using a future authenticated NAMINA Studio
API/MCP layer. GitHub access is for source maintenance, NOT for publishing
each client's website. There is currently no assumption that Hermes already
has a connected NAMINA write API. Never give Hermes a Supabase service-role key,
an unrestricted DB connection, or a shared admin password.
Until the scoped API exists, do not directly mutate customer records.

## Change controls

- Work on a feature branch and open a Pull Request; do not push to `main`.
- Do not deploy, run hosted database migrations, change domains, modify secrets,
  or write production customer data without explicit owner approval.
- Run lint, typecheck, tests and build when tooling is available. For dynamic
  publication verify hosted DB migration, RLS, preview, legacy fallback, and
  no new Vercel deployment on site publish before claiming completion.
- Record what was actually tested versus what still needs verification.


<!-- antislop:start -->
## Anti Slop (project-local)

The original skills are installed under `.codex/skills/`, sourced from [miqdadbadjuber/anti-slop](https://github.com/miqdadbadjuber/anti-slop) at commit `9504989f162a92b1996853eccbb3d8a86e73df68` (MIT).

- At the start of design or implementation work, load `.codex/skills/antislop/SKILL.md`. Resolve its **During / After** mode as instructed there; do not silently turn an audit into an edit.
- For interface and motion work, also load `.codex/skills/antislop-ui/SKILL.md` and read `DESIGN.md` for project-specific visual direction.
- For mobile/responsive changes, load `.codex/skills/antislop-layoutmobile/SKILL.md`.
- For accessibility and interactive states, load `.codex/skills/antislop-human/SKILL.md`.
- For UI text and marketing copy, load `.codex/skills/antislop-copywriting/SKILL.md`.
- For AI-generated code-comment cleanup, load `.codex/skills/antislop-code/SKILL.md`.
- Before shipping changes, run the core Delivery Gate and the relevant specialist checklist. Fix observable issues; do not invent performance scores or data.

Use the skills as critical filters, not as a substitute for Teh Vini's creative direction or actual visual testing.
<!-- antislop:end -->
