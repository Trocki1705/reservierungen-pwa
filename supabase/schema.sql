create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id) on delete cascade,
  table_number int not null,
  seats int not null,
  active boolean not null default true,
  unique(area_id, table_number)
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  phone text,
  party_size int not null check (party_size > 0),
  start_time timestamptz not null,
  duration_minutes int not null default 120 check (duration_minutes > 0),
  status text not null default 'confirmed'
    check (status in ('requested','confirmed','arrived','cancelled','no_show')),
  notes text,
  area_id uuid not null references areas(id) on delete restrict,
  table_id uuid references tables(id) on delete set null,
  fallback_area_id uuid references areas(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_res_start_time on reservations(start_time);
create index if not exists idx_res_area_time on reservations(area_id, start_time);
create index if not exists idx_res_table_time on reservations(table_id, start_time);

create or replace function find_free_tables(
  p_area_id uuid,
  p_new_start timestamptz,
  p_party_size int,
  p_duration_minutes int default 120,
  p_buffer_minutes int default 15
)
returns setof tables
language sql
stable
as $$
  with params as (
    select
      p_area_id as area_id,
      p_new_start as new_start,
      (p_new_start + make_interval(mins => p_duration_minutes + p_buffer_minutes)) as new_end,
      p_party_size as party_size,
      p_buffer_minutes as buffer_minutes
  )
  select t.*
  from tables t
  join params p on p.area_id = t.area_id
  where t.active = true
    and t.seats >= p.party_size
    and not exists (
      select 1
      from reservations r
      where r.table_id = t.id
        and r.status in ('requested','confirmed','arrived')
        and r.start_time < p.new_end
        and (r.start_time + make_interval(mins => r.duration_minutes + p.buffer_minutes)) > p.new_start
    )
  order by t.seats asc, t.table_number asc;
$$;
