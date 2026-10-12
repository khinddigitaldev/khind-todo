-- KHIND IQC core schema. See notes/02 Spec.md §10.

create type public.app_role as enum ('inspector','qa','purchasing','management','admin');
create type public.supplier_status as enum ('approved','probation','blocked');
create type public.inspection_type as enum ('sampling','full','none');
create type public.defect_class as enum ('critical','major','minor');
create type public.inspection_status as enum ('draft','submitted','returned','approved');
create type public.check_result as enum ('ok','ng','na');
create type public.disposition as enum ('accept','concession','sort','reject');
create type public.ncr_status as enum ('open','waiting_supplier','closed');
create type public.sampling_stage as enum ('normal','tightened');

-- People ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.app_role not null default 'inspector',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''),
          coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
                   split_part(coalesce(new.email, 'user'), '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this migration (from the todo course) get a profile too.
insert into public.profiles (id, email, full_name)
select id, coalesce(email, ''), split_part(coalesce(email, 'user'), '@', 1) from auth.users
on conflict (id) do nothing;

-- Master data ----------------------------------------------------------------
create table public.suppliers (
  id bigint generated always as identity primary key,
  code text not null unique check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 1 and 120),
  status public.supplier_status not null default 'approved',
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.templates (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.template_versions (
  id bigint generated always as identity primary key,
  template_id bigint not null references public.templates (id),
  version int not null check (version >= 1),
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

create table public.template_items (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.template_versions (id),
  section text not null check (char_length(section) between 1 and 80),
  position int not null,
  text text not null check (char_length(text) between 1 and 300),
  unique (version_id, position)
);

create table public.template_characteristics (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.template_versions (id),
  position int not null,
  name text not null check (char_length(name) between 1 and 120),
  nominal numeric,
  min_value numeric,
  max_value numeric,
  unit text not null default 'mm',
  defect_class public.defect_class not null default 'major',
  check (min_value is null or max_value is null or min_value <= max_value),
  unique (version_id, position)
);

create table public.parts (
  id bigint generated always as identity primary key,
  part_no text not null unique check (char_length(part_no) between 1 and 40),
  name text not null check (char_length(name) between 1 and 120),
  category text,
  drawing_no text,
  drawing_rev text,
  regulated boolean not null default false,
  template_id bigint references public.templates (id),
  inspection_type public.inspection_type not null default 'sampling',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- KHIND sampling table (c = 0 by default) ------------------------------------
create table public.sampling_bands (
  id bigint generated always as identity primary key,
  plan_source text not null default 'KHIND',
  lot_min int not null check (lot_min >= 1),
  lot_max int check (lot_max is null or lot_max >= lot_min),
  sample_normal int check (sample_normal is null or sample_normal >= 1),        -- null = inspect all
  sample_tightened int check (sample_tightened is null or sample_tightened >= 1),
  active boolean not null default true
);

create table public.sampling_acceptance (
  plan_source text not null default 'KHIND',
  defect_class public.defect_class not null,
  ac int not null default 0 check (ac >= 0),
  re int generated always as (ac + 1) stored,
  primary key (plan_source, defect_class)
);

-- Numbering ------------------------------------------------------------------
create table public.doc_counters (
  kind text not null,
  year int not null,
  last int not null default 0,
  primary key (kind, year)
);

create function public.next_number(p_kind text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  insert into public.doc_counters (kind, year, last) values (p_kind, y, 1)
  on conflict (kind, year) do update set last = public.doc_counters.last + 1
  returning last into n;
  return p_kind || '-' || y || '-' || lpad(n::text, 4, '0');
end $$;

-- Inspections ----------------------------------------------------------------
create table public.inspections (
  id bigint generated always as identity primary key,
  number text not null unique,
  status public.inspection_status not null default 'draft',
  supplier_id bigint not null references public.suppliers (id),
  part_id bigint not null references public.parts (id),
  template_version_id bigint not null references public.template_versions (id),
  po_no text,
  do_no text,
  lot_no text,
  qty_received int not null check (qty_received between 1 and 10000000),
  received_at timestamptz not null default now(),
  stage public.sampling_stage not null default 'normal',
  sample_size int not null check (sample_size >= 1),
  sample_override_reason text,
  instrument text,
  section_notes jsonb not null default '{}'::jsonb,
  verdict text check (verdict in ('accept', 'reject')),
  inspector_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  return_comment text,
  approver_id uuid references public.profiles (id),
  approved_at timestamptz,
  disposition public.disposition,
  concession_reason text,
  reopen_reason text,
  site text not null default 'main'
);
create index inspections_status_idx on public.inspections (status);
create index inspections_supplier_received_idx on public.inspections (supplier_id, received_at);
create index inspections_approved_at_idx on public.inspections (approved_at);

create table public.inspection_checks (
  inspection_id bigint not null references public.inspections (id) on delete cascade,
  item_id bigint not null references public.template_items (id),
  result public.check_result not null,
  comment text check (comment is null or char_length(comment) <= 500),
  primary key (inspection_id, item_id)
);

create table public.inspection_measurements (
  inspection_id bigint not null references public.inspections (id) on delete cascade,
  characteristic_id bigint not null references public.template_characteristics (id),
  readings numeric[] not null default '{}',
  result text check (result in ('ok', 'ng')),
  primary key (inspection_id, characteristic_id)
);

create table public.inspection_defects (
  inspection_id bigint not null references public.inspections (id) on delete cascade,
  defect_class public.defect_class not null,
  found int check (found >= 0),
  ac int,
  re int,
  description text check (description is null or char_length(description) <= 500),
  primary key (inspection_id, defect_class)
);

create table public.attachments (
  id bigint generated always as identity primary key,
  inspection_id bigint not null references public.inspections (id) on delete cascade,
  item_id bigint references public.template_items (id),
  storage_path text not null unique,
  bytes int not null check (bytes between 1 and 204800),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.ncrs (
  id bigint generated always as identity primary key,
  number text not null unique,
  inspection_id bigint not null unique references public.inspections (id),
  qty_affected int not null,
  summary text not null,
  disposition public.disposition not null,
  scar_no text,
  rma_no text,
  supplier_response text,
  status public.ncr_status not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text not null,
  inspection_id bigint,
  action text not null,
  changes jsonb not null,
  user_id uuid,
  at timestamptz not null default now()
);
create index audit_log_inspection_idx on public.audit_log (inspection_id, at);

create table public.backups (
  id bigint generated always as identity primary key,
  run_by uuid not null default auth.uid() references public.profiles (id),
  at timestamptz not null default now(),
  row_count int not null,
  note text
);

-- Sample size: computed by the database only ---------------------------------
create function public.sample_size_for(
  p_lot int, p_stage public.sampling_stage, p_type public.inspection_type default 'sampling'
) returns int language plpgsql stable set search_path = '' as $$
declare
  b public.sampling_bands;
  s int;
begin
  if p_lot is null or p_lot < 1 then
    raise exception 'Lot size must be at least 1';
  end if;
  if p_type = 'full' then
    return p_lot;
  end if;
  select * into b from public.sampling_bands
  where active and plan_source = 'KHIND' and p_lot >= lot_min and (lot_max is null or p_lot <= lot_max)
  order by lot_min desc limit 1;
  if not found then
    raise exception 'No sampling band covers a lot of %. Ask QA to update the sampling table.', p_lot;
  end if;
  s := case p_stage when 'tightened' then b.sample_tightened else b.sample_normal end;
  if s is null or s >= p_lot then
    return p_lot;
  end if;
  return s;
end $$;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger inspections_touch before update on public.inspections
  for each row execute function public.touch_updated_at();

create function public.inspections_resample() returns trigger
language plpgsql set search_path = '' as $$
declare
  t public.inspection_type;
begin
  if new.sample_override_reason is null
     and (new.qty_received is distinct from old.qty_received or new.stage is distinct from old.stage) then
    select inspection_type into t from public.parts where id = new.part_id;
    new.sample_size := public.sample_size_for(new.qty_received, new.stage, t);
  end if;
  return new;
end $$;
create trigger inspections_resample before update of qty_received, stage on public.inspections
  for each row execute function public.inspections_resample();
