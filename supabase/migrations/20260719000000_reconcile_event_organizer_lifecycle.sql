-- Reconcile clean-dev projects created before organizer invitation lifecycle
-- fields were added to the frozen commercial v0.1 schema.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'event_organizer_status'
  ) then
    create type public.event_organizer_status as enum ('invited', 'active', 'declined');
  end if;
end
$$;

alter table public.event_organizers
  add column if not exists status event_organizer_status not null default 'active',
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz;

update public.event_organizers
set accepted_at = coalesce(accepted_at, created_at)
where status = 'active'
  and accepted_at is null;
