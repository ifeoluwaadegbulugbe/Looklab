-- Layered outfits: which layer is being added (1 = top, 2 = bottom over the step-1 result).
-- Paste into Supabase > SQL Editor > Run. Safe to run more than once.
alter table public.try_on_sessions
  add column if not exists outfit_step smallint check (outfit_step in (1, 2));
