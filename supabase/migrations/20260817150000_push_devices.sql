create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_token text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_token)
);

create index if not exists push_devices_user_idx on public.push_devices(user_id);
create index if not exists push_devices_active_idx on public.push_devices(is_active, platform);

create trigger push_devices_set_updated_at
  before update on public.push_devices
  for each row execute function public.set_updated_at();

alter table public.push_devices enable row level security;

create policy "users can read own push devices"
  on public.push_devices for select
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

create policy "users can upsert own push devices"
  on public.push_devices for insert
  with check (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

create policy "users can update own push devices"
  on public.push_devices for update
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  )
  with check (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

grant select, insert, update on public.push_devices to authenticated;