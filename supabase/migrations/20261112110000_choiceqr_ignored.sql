-- ChoiceQR dishes the admin chose not to add to the trainer («Не додавати в тренажер» in the ChoiceQR tab),
-- e.g. bread add-ons. api/sync-choiceqr.js leaves them out of «Нові страви в ChoiceQR».
-- key = "CATEGORY|NAME" in upper case (lib/choiceqr.mjs choiceqrKey), the same way dishes are matched.

create table public.choiceqr_ignored (
  key text primary key,
  name text not null,
  section text not null default '',
  category text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null
);

alter table public.choiceqr_ignored enable row level security;

create policy "choiceqr ignored: admins read" on public.choiceqr_ignored
  for select to authenticated using (public.is_admin());
create policy "choiceqr ignored: admins add" on public.choiceqr_ignored
  for insert to authenticated with check (public.is_admin());
create policy "choiceqr ignored: admins remove" on public.choiceqr_ignored
  for delete to authenticated using (public.is_admin());

revoke all on public.choiceqr_ignored from anon;
