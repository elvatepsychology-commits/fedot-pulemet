-- CRM крео: общая таблица на команду (Гриша + topdenchick).
-- Применяется через Supabase MCP или SQL Editor в дашборде.

create table if not exists public.creatives (
  id text primary key default ('c' || extract(epoch from now())::bigint::text || substr(md5(random()::text), 1, 6)),
  name text not null,                -- полный нейминг, напр. EN-MGM-209-176-STORY-920-ID-OFF-CDC-001
  camp_name text,                    -- название кампании/адсета в Ads Manager (опционально)
  lang text, team text,
  buyer_own text not null,           -- кто залил (209 / 176)
  buyer_link text,                   -- чья связка, если не своя
  format text, script text, state text, slot text, brand text, num int,
  upload_date date,                  -- дата заливки
  upload_time time,                  -- время заливки
  status text default 'test',        -- test | hold | dup | cut | kill | wait
  stats jsonb default '[]'::jsonb,   -- [{date, spend, clicks, regs, deps, revenue}]
  note text,
  created_by text,                   -- ник байера-автора записи
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists creatives_buyer_own_idx on public.creatives (buyer_own);
create index if not exists creatives_upload_date_idx on public.creatives (upload_date);
create index if not exists creatives_created_at_idx on public.creatives (created_at desc);

alter table public.creatives enable row level security;

-- Таблица общая только для двух байеров команды: открыта на чтение/запись всем с anon-ключом
-- (ключ не публикуется за пределами их рабочего инструмента). Если нужно жёстче —
-- заменить на проверку заголовка/JWT после настройки Supabase Auth.
drop policy if exists "creatives_select" on public.creatives;
create policy "creatives_select" on public.creatives for select using (true);
drop policy if exists "creatives_insert" on public.creatives;
create policy "creatives_insert" on public.creatives for insert with check (true);
drop policy if exists "creatives_update" on public.creatives;
create policy "creatives_update" on public.creatives for update using (true);
drop policy if exists "creatives_delete" on public.creatives;
create policy "creatives_delete" on public.creatives for delete using (true);

-- realtime, чтобы изменения у одного байера сразу прилетали второму
alter publication supabase_realtime add table public.creatives;
