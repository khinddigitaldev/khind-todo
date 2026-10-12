-- How close are we to the Supabase Free limits? (admin and QA only)
create function public.usage_stats()
returns table (db_bytes bigint, photo_bytes bigint, photo_count bigint)
language sql stable security definer set search_path = '' as $$
  select pg_database_size(current_database()),
         coalesce((select sum((o.metadata ->> 'size')::bigint) from storage.objects o where o.bucket_id = 'inspection-photos'), 0),
         (select count(*) from storage.objects o where o.bucket_id = 'inspection-photos')
  where public.has_role('admin', 'qa')
$$;
revoke execute on function public.usage_stats from public, anon;
grant execute on function public.usage_stats to authenticated;
