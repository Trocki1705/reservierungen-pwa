-- Bereiche
insert into areas (name, sort_order)
values
  ('Restaurant', 1),
  ('Pizzastube', 2),
  ('Terrasse', 3)
on conflict (name) do nothing;

-- Restaurant: Tische 10-22
with a as (select id from areas where name='Restaurant')
insert into tables (area_id, table_number, seats)
select a.id, v.table_number, v.seats
from a
join (values
  (10,8),(11,4),(12,4),(13,4),(14,4),(15,4),(16,5),(17,3),
  (18,4),(19,5),(20,4),(21,3),(22,6)
) as v(table_number, seats) on true
on conflict (area_id, table_number) do update set seats=excluded.seats;

-- Pizzastube: Tische 30-40
with a as (select id from areas where name='Pizzastube')
insert into tables (area_id, table_number, seats)
select a.id, v.table_number, v.seats
from a
join (values
  (30,4),(31,10),(32,8),(33,10),(34,4),(35,4),(36,4),
  (37,2),(38,4),(39,2),(40,2)
) as v(table_number, seats) on true
on conflict (area_id, table_number) do update set seats=excluded.seats;

-- Terrasse: 50-64 (15 Tische), alle 4er
with a as (select id from areas where name='Terrasse')
insert into tables (area_id, table_number, seats)
select a.id, gs, 4
from a
join generate_series(50, 64) as gs on true
on conflict (area_id, table_number) do update set seats=excluded.seats;
