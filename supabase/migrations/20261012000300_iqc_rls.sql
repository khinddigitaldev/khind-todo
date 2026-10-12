-- Who can do what. Enforced by the database, not just the UI.

create function public.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.has_role(variadic roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = any (roles), false)
$$;

create function public.can_edit_inspection(p_id bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('inspector', 'qa') and exists (
    select 1 from public.inspections i
    where i.id = p_id and i.inspector_id = auth.uid() and i.status in ('draft', 'returned'))
$$;

revoke execute on function public.my_role, public.has_role, public.can_edit_inspection,
  public.next_number, public.sample_size_for from public, anon;
grant execute on function public.my_role, public.has_role, public.can_edit_inspection,
  public.sample_size_for to authenticated;

-- Turn RLS on everywhere
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.templates enable row level security;
alter table public.template_versions enable row level security;
alter table public.template_items enable row level security;
alter table public.template_characteristics enable row level security;
alter table public.parts enable row level security;
alter table public.sampling_bands enable row level security;
alter table public.sampling_acceptance enable row level security;
alter table public.doc_counters enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_checks enable row level security;
alter table public.inspection_measurements enable row level security;
alter table public.inspection_defects enable row level security;
alter table public.attachments enable row level security;
alter table public.ncrs enable row level security;
alter table public.audit_log enable row level security;
alter table public.backups enable row level security;

-- Anyone with an active role may read everything except backups.
create policy "active users read" on public.profiles for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.suppliers for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.templates for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.template_versions for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.template_items for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.template_characteristics for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.parts for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.sampling_bands for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.sampling_acceptance for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.inspections for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.inspection_checks for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.inspection_measurements for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.inspection_defects for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.attachments for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.ncrs for select to authenticated using (public.my_role() is not null);
create policy "active users read" on public.audit_log for select to authenticated using (public.my_role() is not null);
create policy "managers read backups" on public.backups for select to authenticated using (public.has_role('admin', 'qa', 'management'));

-- Profiles: admins change other people's role / active / name.
create policy "admin updates others" on public.profiles for update to authenticated
  using (public.has_role('admin') and id <> auth.uid())
  with check (public.has_role('admin') and id <> auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (role, active, full_name) on public.profiles to authenticated;

-- Master data: QA maintains. Nothing is deleted.
create policy "qa inserts" on public.suppliers for insert to authenticated with check (public.has_role('qa'));
create policy "qa updates" on public.suppliers for update to authenticated using (public.has_role('qa')) with check (public.has_role('qa'));
create policy "qa inserts" on public.parts for insert to authenticated with check (public.has_role('qa'));
create policy "qa updates" on public.parts for update to authenticated using (public.has_role('qa')) with check (public.has_role('qa'));
create policy "qa inserts" on public.templates for insert to authenticated with check (public.has_role('qa'));
create policy "qa updates" on public.templates for update to authenticated using (public.has_role('qa')) with check (public.has_role('qa'));
create policy "qa inserts" on public.sampling_bands for insert to authenticated with check (public.has_role('qa'));
create policy "qa updates" on public.sampling_bands for update to authenticated using (public.has_role('qa')) with check (public.has_role('qa'));
create policy "qa inserts" on public.sampling_acceptance for insert to authenticated with check (public.has_role('qa'));
create policy "qa updates" on public.sampling_acceptance for update to authenticated using (public.has_role('qa')) with check (public.has_role('qa'));
-- Template versions, items and characteristics are insert-only (versions never change).
create policy "qa inserts" on public.template_versions for insert to authenticated with check (public.has_role('qa'));
create policy "qa inserts" on public.template_items for insert to authenticated with check (public.has_role('qa'));
create policy "qa inserts" on public.template_characteristics for insert to authenticated with check (public.has_role('qa'));

-- Inspections: created and moved between statuses only by SQL functions (Task 4).
-- The owner edits header fields while draft/returned; drafts can be deleted.
create policy "owner edits draft" on public.inspections for update to authenticated
  using (public.can_edit_inspection(id)) with check (public.can_edit_inspection(id));
create policy "owner deletes draft" on public.inspections for delete to authenticated
  using (public.can_edit_inspection(id) and status = 'draft');
revoke insert, update on public.inspections from authenticated, anon;
grant update (po_no, do_no, lot_no, qty_received, received_at, instrument, section_notes)
  on public.inspections to authenticated;

create policy "owner writes" on public.inspection_checks for all to authenticated
  using (public.can_edit_inspection(inspection_id)) with check (public.can_edit_inspection(inspection_id));
create policy "owner writes" on public.inspection_measurements for all to authenticated
  using (public.can_edit_inspection(inspection_id)) with check (public.can_edit_inspection(inspection_id));
create policy "owner updates" on public.inspection_defects for update to authenticated
  using (public.can_edit_inspection(inspection_id)) with check (public.can_edit_inspection(inspection_id));
revoke insert, update, delete on public.inspection_defects from authenticated, anon;
grant update (found, description) on public.inspection_defects to authenticated;

create policy "owner adds photos" on public.attachments for insert to authenticated
  with check (public.can_edit_inspection(inspection_id) and created_by = auth.uid());
create policy "owner removes photos" on public.attachments for delete to authenticated
  using (public.can_edit_inspection(inspection_id));

-- NCRs: created by approve_inspection; purchasing and QA fill in supplier follow-up.
create policy "purchasing and qa update" on public.ncrs for update to authenticated
  using (public.has_role('purchasing', 'qa')) with check (public.has_role('purchasing', 'qa'));
revoke insert, update, delete on public.ncrs from authenticated, anon;
grant update (scar_no, rma_no, supplier_response, status, closed_at) on public.ncrs to authenticated;

-- Audit log and counters: written only by security-definer functions.
revoke insert, update, delete on public.audit_log from authenticated, anon;
revoke all on public.doc_counters from authenticated, anon;

-- Backups log
create policy "admin records backups" on public.backups for insert to authenticated
  with check (public.has_role('admin') and run_by = auth.uid());

-- Photos: private bucket, ≤ 200 KB, JPEG/WebP only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 204800, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "iqc photos read" on storage.objects for select to authenticated
  using (bucket_id = 'inspection-photos' and public.my_role() is not null);
create policy "iqc photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'inspection-photos' and case
    when (storage.foldername(name))[1] ~ '^[0-9]+$'
      then public.can_edit_inspection(((storage.foldername(name))[1])::bigint)
    else false end);
create policy "iqc photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'inspection-photos' and case
    when (storage.foldername(name))[1] ~ '^[0-9]+$'
      then public.can_edit_inspection(((storage.foldername(name))[1])::bigint)
    else false end);
