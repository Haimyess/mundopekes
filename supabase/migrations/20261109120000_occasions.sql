-- Occasions: holidays and school breaks that drive the «¿Cuándo?» shortcut,
-- the home contextual section and, later, the SEO occasion pages.
--
-- `key` identifies the occasion across years (hanukkah, pesach…); every row is
-- one edition with real dates. The web resolves `when=occasion:<key>` to the
-- next edition that is not over, so saved searches never expire.
--
-- Dates are local dates in Asia/Jerusalem. Hebrew-calendar dates were computed
-- with the ICU Hebrew calendar (Intl, `en-u-ca-hebrew`); Yom HaAtzmaut follows
-- the official shifting rule. `summer-break` uses the primary-school dates and
-- must be checked against the Ministry of Education calendar every year.

create table if not exists public.occasions (
  id uuid primary key default gen_random_uuid(),
  key text not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null check (kind in ('holiday', 'school_break', 'event')),
  name_i18n jsonb not null check (jsonb_typeof(name_i18n) = 'object' and name_i18n ? 'he'),
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occasions_date_order check (ends_on >= starts_on),
  constraint occasions_key_edition unique (key, starts_on)
);

create index if not exists occasions_active_ends_on_idx
  on public.occasions (ends_on)
  where is_active;

drop trigger if exists occasions_set_updated_at on public.occasions;
create trigger occasions_set_updated_at
  before update on public.occasions
  for each row execute function public.update_updated_at_column();

alter table public.occasions enable row level security;

drop policy if exists "occasions: select público activas" on public.occasions;
create policy "occasions: select público activas"
  on public.occasions for select
  to anon, authenticated
  using (is_active);

drop policy if exists "occasions: select admin todas" on public.occasions;
create policy "occasions: select admin todas"
  on public.occasions for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "occasions: insert admin" on public.occasions;
create policy "occasions: insert admin"
  on public.occasions for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "occasions: update admin" on public.occasions;
create policy "occasions: update admin"
  on public.occasions for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "occasions: delete admin" on public.occasions;
create policy "occasions: delete admin"
  on public.occasions for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

comment on table public.occasions is
  'Holidays, school breaks and events (Asia/Jerusalem local dates). One row per edition; `key` groups editions across years.';

insert into public.occasions (key, kind, name_i18n, starts_on, ends_on) values
  ('hanukkah', 'holiday', '{"he":"חנוכה","es":"Janucá","en":"Hanukkah","ru":"Ханука"}', '2026-12-05', '2026-12-12'),
  ('purim', 'holiday', '{"he":"פורים","es":"Purim","en":"Purim","ru":"Пурим"}', '2027-03-23', '2027-03-24'),
  ('pesach', 'holiday', '{"he":"פסח","es":"Pésaj","en":"Passover","ru":"Песах"}', '2027-04-22', '2027-04-28'),
  ('yom-haatzmaut', 'holiday', '{"he":"יום העצמאות","es":"Día de la Independencia","en":"Independence Day","ru":"День независимости"}', '2027-05-12', '2027-05-12'),
  ('lag-baomer', 'holiday', '{"he":"ל״ג בעומר","es":"Lag BaÓmer","en":"Lag BaOmer","ru":"Лаг ба-Омер"}', '2027-05-25', '2027-05-25'),
  ('shavuot', 'holiday', '{"he":"שבועות","es":"Shavuot","en":"Shavuot","ru":"Шавуот"}', '2027-06-11', '2027-06-11'),
  ('summer-break', 'school_break', '{"he":"החופש הגדול","es":"Vacaciones de verano","en":"Summer break","ru":"Летние каникулы"}', '2027-07-01', '2027-08-31'),
  ('rosh-hashanah', 'holiday', '{"he":"ראש השנה","es":"Rosh Hashaná","en":"Rosh Hashanah","ru":"Рош ха-Шана"}', '2027-10-02', '2027-10-03'),
  ('sukkot', 'holiday', '{"he":"סוכות","es":"Sucot","en":"Sukkot","ru":"Суккот"}', '2027-10-16', '2027-10-23'),
  ('hanukkah', 'holiday', '{"he":"חנוכה","es":"Janucá","en":"Hanukkah","ru":"Ханука"}', '2027-12-25', '2028-01-01')
on conflict (key, starts_on) do nothing;
