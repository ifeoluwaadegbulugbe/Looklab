-- Experimental outfits: one try-on built from two catalogue pieces (upper + lower).
-- Paste into Supabase > SQL Editor > Run. Safe to run more than once.

alter table public.try_on_sessions
  add column if not exists outfit_product_ids uuid[];

-- Owners may read the outfit pieces (column-level grant, like the other session columns).
grant select (outfit_product_ids) on public.try_on_sessions to authenticated;

-- Also included here in case 20261108000001 wasn't run yet: one saved look per try-on per user.
create unique index if not exists saved_looks_one_per_session
  on public.saved_looks (user_id, try_on_session_id)
  where try_on_session_id is not null;
