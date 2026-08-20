BEGIN;

-- The identity loop is a daily practice. There should be exactly one focus per user per day.
-- Keep the most recently updated row when older duplicate focuses already exist.
DELETE FROM public.identity_loops
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY user_id, loop_date
             ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS rn
    FROM public.identity_loops
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS identity_loops_user_date_unique
  ON public.identity_loops (user_id, loop_date);

-- The current API still targets the older (user_id, loop_date, identity_key)
-- conflict target. If it tries to generate a new focus later in the same day,
-- rewrite the insert to the already-established daily focus so it cannot change
-- the user's three-time affirmation merely because the page was reopened.
CREATE OR REPLACE FUNCTION public.keep_daily_identity_loop_stable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_row public.identity_loops%ROWTYPE;
BEGIN
  SELECT * INTO existing_row
  FROM public.identity_loops
  WHERE user_id = NEW.user_id
    AND loop_date = NEW.loop_date
  LIMIT 1;

  IF FOUND THEN
    NEW.identity_key := existing_row.identity_key;
    NEW.identity_title := existing_row.identity_title;
    NEW.repetitions := COALESCE(existing_row.repetitions, NEW.repetitions);
    NEW.proof := existing_row.proof;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS identity_loops_keep_daily_focus ON public.identity_loops;
CREATE TRIGGER identity_loops_keep_daily_focus
BEFORE INSERT ON public.identity_loops
FOR EACH ROW
EXECUTE FUNCTION public.keep_daily_identity_loop_stable();

COMMIT;
