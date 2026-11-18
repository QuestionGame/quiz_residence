-- profile.html: every active user may change their own display name — and nothing else.
-- Column privilege: an UPDATE that touches role, is_active, username… is rejected by Postgres
-- before RLS is even checked. Role, access and other people's accounts stay with api/admin-users.js.
-- (Passwords are changed through Supabase Auth, not this table.)

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "profiles: active user renames self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and public.is_active_user())
  with check (id = (select auth.uid()));
