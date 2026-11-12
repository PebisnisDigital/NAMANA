-- NAMINA dynamic publishing: public, published-only documents.
-- Media files remain on external HTTPS hosts; Postgres stores URLs only.
-- Existing public/clients JSON files stay untouched and work as fallback.
create table if not exists public.namina_published_sites (
  slug text primary key
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'
      and slug not in ('admin','api','studio','studio-v1','studio-v2','studio-v2-canvas',
        'mitra','daftar','akses','generator','formulir','login','auth','gaya','templates',
        'privacy','terms','checkout','dashboard','support','www','new','demo')),
  document jsonb not null
    check (jsonb_typeof(document) = 'object'
      and document ->> 'slug' = slug
      and jsonb_typeof(document -> 'content') = 'object'
      and jsonb_typeof(document -> 'media') = 'object'
      and pg_column_size(document) <= 250000),
  source text not null check (source in ('admin','partner')),
  workspace_id uuid references public.namina_business_workspaces(id) on delete restrict,
  revision bigint not null default 1 check (revision >= 1),
  published_at timestamptz not null default now(),
  constraint namina_published_owner_match check (
    (source = 'admin' and workspace_id is null)
    or (source = 'partner' and workspace_id is not null)
  )
);
create index if not exists namina_published_sites_recent_idx
  on public.namina_published_sites(published_at desc);
alter table public.namina_published_sites enable row level security;
revoke all on public.namina_published_sites from public,anon,authenticated;
grant select(slug,document,revision,published_at) on public.namina_published_sites to anon,authenticated;
create policy namina_published_public_read
  on public.namina_published_sites for select to anon,authenticated using (true);
-- No client role has INSERT, UPDATE, or DELETE on public records.
-- A server-side admin API (service role) or the validated partner RPC publishes.

create table if not exists public.namina_legacy_slugs (
  slug text primary key
);
revoke all on public.namina_legacy_slugs from public,anon,authenticated;
alter table public.namina_legacy_slugs enable row level security;
insert into public.namina_legacy_slugs(slug) values ('vini') on conflict do nothing;

-- Prevent a partner reserving an address already serving a static or dynamic site.
create or replace function public.namina_business_check_site_slug()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists(select 1 from public.namina_legacy_slugs l where l.slug = new.slug)
    or exists(select 1 from public.namina_published_sites p where p.slug = new.slug)
  then
    raise exception 'Alamat website sudah dipakai. Pilih nama link lain.' using errcode='23505';
  end if;
  return new;
end;
$$;
revoke all on function public.namina_business_check_site_slug() from public,anon,authenticated;
drop trigger if exists namina_business_check_site_slug_insert on public.namina_business_sites;
create trigger namina_business_check_site_slug_insert
  before insert on public.namina_business_sites
  for each row execute function public.namina_business_check_site_slug();

-- One server-controlled publish action: only the owner with a non-revoked link
-- can publish their own draft. Expired plans can still EDIT and PUBLISH existing
-- sites; the CREATE constraint remains on INSERT, independently.
create or replace function public.namina_business_publish_site(p_site_id uuid)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_site record;
  v_revision bigint;
begin
  if auth.uid() is null then
    raise exception 'Masuk ke Studio Mitra terlebih dahulu.' using errcode='42501';
  end if;
  select s.id,s.slug,s.document,s.workspace_id,w.owner_id,w.subscription_status
    into v_site
    from public.namina_business_sites s
    join public.namina_business_workspaces w on w.id = s.workspace_id
    where s.id = p_site_id
    for update of s;
  if not found
    or v_site.owner_id <> auth.uid()
    or v_site.subscription_status = 'suspended'
    or not public.namina_business_session_valid(v_site.workspace_id)
  then
    raise exception 'Tidak memiliki izin menerbitkan website ini.' using errcode='42501';
  end if;
  if v_site.document ->> 'slug' is distinct from v_site.slug
    or jsonb_typeof(v_site.document -> 'content') is distinct from 'object'
    or jsonb_typeof(v_site.document -> 'media') is distinct from 'object'
    or pg_column_size(v_site.document) > 250000
  then
    raise exception 'Data website tidak valid.' using errcode='22023';
  end if;
  if exists(select 1 from public.namina_legacy_slugs where slug=v_site.slug) then
    raise exception 'Alamat ini telah digunakan website lama.' using errcode='23505';
  end if;

  insert into public.namina_published_sites(slug,document,source,workspace_id)
  values (v_site.slug,v_site.document,'partner',v_site.workspace_id)
  on conflict(slug) do update
    set document=excluded.document,
        published_at=now(),
        revision=public.namina_published_sites.revision+1
    where public.namina_published_sites.source='partner'
      and public.namina_published_sites.workspace_id=excluded.workspace_id
  returning revision into v_revision;
  if v_revision is null then
    raise exception 'Alamat website sudah digunakan akun lain.' using errcode='23505';
  end if;

  update public.namina_business_sites
    set published_sha='db:'||v_revision::text
    where id=p_site_id;
  return v_revision;
end;
$$;
revoke all on function public.namina_business_publish_site(uuid) from public,anon;
grant execute on function public.namina_business_publish_site(uuid) to authenticated;
