-- Guest mode: the trainer works without signing in (catalog + quiz). Guests only read the active menu;
-- their answers stay in their browser and never reach quiz_attempts (anon still has no access there).
-- Column grant: guests get only what the trainer needs — not updated_by / updated_at / choiceqr_name.

grant select (page, id, data, name, sort_order, is_active) on public.menu_items to anon;

create policy "menu: guests read active items" on public.menu_items
  for select to anon
  using (is_active);
