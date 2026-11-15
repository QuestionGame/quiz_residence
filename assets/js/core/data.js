/* Menu items of a section, from Supabase (table menu_items; edited in admin.html). */
import { supabase } from './auth.js';

export async function loadItems(page) {
  const { data, error } = await supabase.from('menu_items')
    .select('id, data')
    .eq('page', page)
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) throw new Error(error.message);
  // `data` holds the item exactly as the quiz pages use it; the row id is its id.
  return data.map(row => ({ ...row.data, id: row.id }));
}
