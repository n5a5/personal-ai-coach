BEGIN;

CREATE OR REPLACE FUNCTION public.award_evening_reflection_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.evening_completed IS TRUE
     AND COALESCE(OLD.evening_completed, false) IS DISTINCT FROM true THEN
    INSERT INTO public.point_transactions (user_id, amount, reason, event_date)
    VALUES (NEW.user_id, 2, 'Evening reflection', NEW.log_date)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_evening_reflection_points_trigger ON public.daily_logs;
CREATE TRIGGER award_evening_reflection_points_trigger
  AFTER INSERT OR UPDATE OF evening_completed ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.award_evening_reflection_points();

REVOKE EXECUTE ON FUNCTION public.award_evening_reflection_points() FROM public, anon, authenticated;

COMMIT;
