-- One saved look per try-on per user. Guards against double submits (e.g. two tabs, retries).
-- Paste into Supabase > SQL Editor > Run.
create unique index if not exists saved_looks_one_per_session
  on public.saved_looks (user_id, try_on_session_id)
  where try_on_session_id is not null;
