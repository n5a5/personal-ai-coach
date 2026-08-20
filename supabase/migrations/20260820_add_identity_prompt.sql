ALTER TABLE public.identity_loops
  ADD COLUMN IF NOT EXISTS identity_prompt text;
