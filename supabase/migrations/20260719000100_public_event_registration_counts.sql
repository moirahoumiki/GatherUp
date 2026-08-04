-- Publish aggregate capacity usage without exposing participant registration rows.

create or replace function public.get_public_event_registration_counts(
  p_event_ids uuid[] default null
)
returns table (event_id uuid, registered_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    e.id as event_id,
    coalesce(
      sum(r.quantity) filter (
        where r.status not in ('cancelled', 'expired', 'refunded')
      ),
      0
    )::bigint as registered_count
  from public.events e
  left join public.registrations r on r.event_id = e.id
  where e.visibility in ('public', 'unlisted')
    and (p_event_ids is null or e.id = any(p_event_ids))
  group by e.id;
$$;

revoke all on function public.get_public_event_registration_counts(uuid[]) from public;
grant execute on function public.get_public_event_registration_counts(uuid[]) to anon, authenticated;
