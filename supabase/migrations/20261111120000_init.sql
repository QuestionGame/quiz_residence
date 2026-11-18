-- Residence Trainer: staff accounts, menu items, quiz results, item photos.
--
-- Access model (enforced here with Row Level Security, not in the browser):
--   staff  – reads the active menu, writes and reads only their own quiz attempts
--   admin  – everything above + edits the menu, reads everyone's results, uploads photos
-- Accounts are created / changed only by api/admin-users.js with the service-role key
-- (public sign-up is disabled in supabase/config.toml).

create type public.app_role as enum ('staff', 'admin');

/* ------------------------------------------------------------ profiles */

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  full_name text not null check (length(btrim(full_name)) between 1 and 80),
  role public.app_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Staff accounts. Login = username, mapped to <username>@staff.residence.local in auth.users.';

-- Helpers used by the policies. SECURITY DEFINER so they can read profiles without recursing into its RLS.
create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_active);
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and is_active);
$$;

alter table public.profiles enable row level security;

create policy "profiles: read own, admins read all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
-- No insert / update / delete policies: only the service role (api/admin-users.js) changes accounts.

/* ---------------------------------------------------------- menu items */

create table public.menu_items (
  page text not null check (page in ('wine', 'bar', 'cocktails', 'menu')),
  id text not null check (id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  -- The item exactly as the quiz pages use it (fields differ per page, see assets/js/pages.js).
  data jsonb not null check (jsonb_typeof(data) = 'object' and length(btrim(data ->> 'name')) > 0),
  name text generated always as (data ->> 'name') stored,
  -- ChoiceQR dish name ("NAME" or "CATEGORY|NAME") used by the price / photo sync; null = not synced.
  choiceqr_name text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (page, id)
);

create index menu_items_page_order on public.menu_items (page, sort_order);

create function public.touch_menu_item() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

create trigger menu_items_touch before insert or update on public.menu_items
  for each row execute function public.touch_menu_item();

alter table public.menu_items enable row level security;

create policy "menu: active staff read active items, admins read all" on public.menu_items
  for select to authenticated
  using (public.is_admin() or (is_active and public.is_active_user()));

create policy "menu: admins insert" on public.menu_items
  for insert to authenticated with check (public.is_admin());

create policy "menu: admins update" on public.menu_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

/* -------------------------------------------------------- quiz attempts */

create table public.quiz_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  page text not null check (page in ('wine', 'bar', 'cocktails', 'menu')),
  item_id text not null,
  item_name text not null,
  is_correct boolean not null,
  -- Per question: [{ key, label, correct: [...], chosen: [...], isCorrect, optional }]
  details jsonb not null default '[]' check (jsonb_typeof(details) = 'array'),
  created_at timestamptz not null default now()
);

create index quiz_attempts_user_page_time on public.quiz_attempts (user_id, page, created_at desc);
create index quiz_attempts_time on public.quiz_attempts (created_at desc);

alter table public.quiz_attempts enable row level security;

create policy "attempts: active users add their own" on public.quiz_attempts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());

create policy "attempts: read own, admins read all" on public.quiz_attempts
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- Append-only: no update / delete policies.

-- "Очистити список" in the mistakes bank: mistakes older than this moment are hidden for the user.
create table public.mistake_resets (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  page text not null check (page in ('wine', 'bar', 'cocktails', 'menu')),
  cleared_at timestamptz not null default now(),
  primary key (user_id, page)
);

alter table public.mistake_resets enable row level security;

create policy "mistake resets: own rows" on public.mistake_resets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_active_user());

/* ------------------------------------------------------ result queries */

-- Latest answer per user / page / item: drives the personal mistakes bank.
create view public.latest_item_results with (security_invoker = true) as
  select distinct on (user_id, page, item_id)
         user_id, page, item_id, item_name, is_correct, created_at
  from public.quiz_attempts
  order by user_id, page, item_id, created_at desc;

-- Totals per user and page since a moment (staff get their own rows, admins everyone's — RLS applies).
create function public.attempt_summary(since timestamptz default '-infinity', only_page text default null)
returns table (
  user_id uuid, username text, full_name text, role public.app_role, is_active boolean,
  page text, attempts bigint, correct bigint, items bigint, last_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select a.user_id, p.username, p.full_name, p.role, p.is_active,
         a.page, count(*), count(*) filter (where a.is_correct), count(distinct a.item_id), max(a.created_at)
  from public.quiz_attempts a
  join public.profiles p on p.id = a.user_id
  where a.created_at >= since and (only_page is null or a.page = only_page)
  group by a.user_id, p.username, p.full_name, p.role, p.is_active, a.page;
$$;

/* ------------------------------------------------------------- grants */

-- Nothing is readable without signing in.
revoke all on public.profiles, public.menu_items, public.quiz_attempts, public.mistake_resets from anon;
revoke all on public.latest_item_results from anon;
revoke execute on function public.attempt_summary(timestamptz, text) from anon, public;
grant execute on function public.attempt_summary(timestamptz, text) to authenticated;
revoke execute on function public.is_admin(), public.is_active_user() from anon, public;
grant execute on function public.is_admin(), public.is_active_user() to authenticated;

/* ------------------------------------------------------ photo storage */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Public bucket: anyone can view a photo by URL; only admins upload, replace or remove.
-- (Replacing a file — upload with upsert — also needs the select policy.)
create policy "menu images: admins read" on storage.objects
  for select to authenticated using (bucket_id = 'menu-images' and public.is_admin());
create policy "menu images: admins upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'menu-images' and public.is_admin());
create policy "menu images: admins update" on storage.objects
  for update to authenticated using (bucket_id = 'menu-images' and public.is_admin());
create policy "menu images: admins delete" on storage.objects
  for delete to authenticated using (bucket_id = 'menu-images' and public.is_admin());
