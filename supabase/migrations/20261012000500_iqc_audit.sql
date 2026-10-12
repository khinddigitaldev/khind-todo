-- Append-only audit trail. Nobody can edit it through the API (see 0300 grants).

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_inspection bigint;
  v_status text;
  v_changes jsonb;
begin
  if tg_table_name = 'inspections' then
    v_inspection := (v_row ->> 'id')::bigint;
    v_status := coalesce(v_old ->> 'status', v_new ->> 'status');
  elsif v_row ? 'inspection_id' then
    v_inspection := (v_row ->> 'inspection_id')::bigint;
    select status::text into v_status from public.inspections where id = v_inspection;
    if v_status is null then return null; end if;  -- parent draft being deleted
  end if;

  -- Skip autosave noise while a draft, but always log creation and status changes.
  if v_status = 'draft' and not (tg_table_name = 'inspections'
       and (tg_op = 'INSERT' or (v_old ->> 'status') is distinct from (v_new ->> 'status'))) then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_array(v_old -> k, v_new -> k)) into v_changes
    from jsonb_object_keys(v_new) k
    where k <> 'updated_at' and (v_old -> k) is distinct from (v_new -> k);
    if v_changes is null then return null; end if;
  else
    v_changes := v_row;
  end if;

  insert into public.audit_log (table_name, row_id, inspection_id, action, changes, user_id)
  values (tg_table_name,
          coalesce(v_row ->> 'id', concat_ws(':', v_row ->> 'inspection_id', v_row ->> 'item_id',
                   v_row ->> 'characteristic_id', v_row ->> 'defect_class', v_row ->> 'plan_source')),
          v_inspection, lower(tg_op), v_changes, auth.uid());
  return null;
end $$;

revoke execute on function public.audit_row from public, anon, authenticated;

create trigger audit after insert or update or delete on public.inspections for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.inspection_checks for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.inspection_measurements for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.inspection_defects for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.attachments for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.ncrs for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.suppliers for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.parts for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.templates for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.template_versions for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.sampling_bands for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.sampling_acceptance for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.profiles for each row execute function public.audit_row();
