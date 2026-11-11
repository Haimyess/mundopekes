-- Business requests: «Quiero sumarme» (join) from /business and «Reclamar
-- ficha» (claim) from a place page. Written only by the web server with the
-- service role after Turnstile + rate limiting; anon/authenticated users have
-- no access. Admins read and review them from the admin inbox.
--
-- Claims are tied to a place and cascade with it: a claim for a deleted place
-- has nothing left to verify.

create table if not exists public.business_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('join', 'claim')),
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'approved', 'rejected')),
  place_id uuid references public.places (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 120),
  activity_type text check (char_length(activity_type) <= 80),
  city text check (char_length(city) <= 80),
  contact_name text check (char_length(contact_name) <= 120),
  role text check (role in ('owner', 'manager', 'employee')),
  email text check (char_length(email) <= 254),
  phone text not null check (char_length(phone) between 7 and 32),
  locale text not null check (locale in ('es', 'en', 'he', 'ru')),
  accepted_terms_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_requests_join_fields check (
    kind <> 'join' or (activity_type is not null and city is not null)
  ),
  constraint business_requests_claim_fields check (
    kind <> 'claim' or (
      place_id is not null
      and contact_name is not null
      and role is not null
      and email is not null
      and accepted_terms_at is not null
    )
  )
);

comment on table public.business_requests is
  'Join and claim requests from businesses. Service role writes; admins review.';

create index if not exists business_requests_status_created_idx
  on public.business_requests (status, created_at desc);

create index if not exists business_requests_place_idx
  on public.business_requests (place_id)
  where place_id is not null;

drop trigger if exists business_requests_set_updated_at on public.business_requests;
create trigger business_requests_set_updated_at
  before update on public.business_requests
  for each row execute function public.update_updated_at_column();

alter table public.business_requests enable row level security;

drop policy if exists "business_requests: select admin" on public.business_requests;
create policy "business_requests: select admin"
  on public.business_requests for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "business_requests: update admin" on public.business_requests;
create policy "business_requests: update admin"
  on public.business_requests for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
