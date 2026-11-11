-- "Прихований доступ": for an account with this flag the quiz turns every checked answer into the correct one
-- (assets/js/quiz.js). Requested by the administrator for his own accounts.
-- Only the service role (api/admin-users.js, admin panel → Користувачі → Змінити) can set it:
-- users may update nothing but their own full_name (see 20261111130000_profile_self_service.sql).
-- A user can read the flag on their own row only; it is not shown in any list or result.

alter table public.profiles add column answer_assist boolean not null default false;
