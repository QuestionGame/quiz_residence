-- «Видалити позицію» in the admin panel (Позиції → Змінити). Only active admins may delete menu items.
-- Workers' answers are kept: quiz_attempts stores item_id / item_name as text (no foreign key),
-- so results in the admin panel still show the deleted dish by name.

create policy "menu: admins delete" on public.menu_items
  for delete to authenticated
  using (public.is_admin());
