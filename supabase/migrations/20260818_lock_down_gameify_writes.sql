BEGIN;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.point_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.gameify_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.gameify_rules FROM anon, authenticated;
GRANT SELECT ON TABLE public.point_transactions TO authenticated;
GRANT SELECT ON TABLE public.gameify_events TO authenticated;
GRANT SELECT ON TABLE public.gameify_rules TO authenticated;

CREATE OR REPLACE FUNCTION public.record_gameify_event(
  p_rule_id uuid,
  p_event_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'America/New_York')::date;
  v_name text;
  v_points integer;
  v_event_id uuid;
  v_transaction_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  IF p_event_date <> v_today THEN RAISE EXCEPTION 'Gameify events can only be recorded for today' USING ERRCODE = '22023'; END IF;

  SELECT r.name, r.points INTO v_name, v_points
  FROM public.gameify_rules AS r
  WHERE r.id = p_rule_id AND r.user_id = v_user_id AND r.active = true;

  IF NOT FOUND THEN RAISE EXCEPTION 'Gameify rule not found' USING ERRCODE = 'P0002'; END IF;
  IF v_points <= 0 THEN RAISE EXCEPTION 'Only positive Gameify rules can be earned here' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.gameify_events (user_id, rule_id, event_date, points)
  VALUES (v_user_id, p_rule_id, p_event_date, v_points)
  ON CONFLICT (user_id, rule_id, event_date) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT pt.id INTO v_transaction_id
    FROM public.point_transactions AS pt
    WHERE pt.user_id = v_user_id AND pt.reason = v_name AND pt.event_date = p_event_date
    ORDER BY pt.created_at DESC LIMIT 1;
    IF v_transaction_id IS NULL THEN
      INSERT INTO public.point_transactions (user_id, amount, reason, event_date)
      VALUES (v_user_id, v_points, v_name, p_event_date);
      RETURN jsonb_build_object('status', 'repaired', 'name', v_name, 'points', v_points);
    END IF;
    RETURN jsonb_build_object('status', 'already_recorded', 'name', v_name, 'points', v_points);
  END IF;

  INSERT INTO public.point_transactions (user_id, amount, reason, event_date)
  VALUES (v_user_id, v_points, v_name, p_event_date);
  RETURN jsonb_build_object('status', 'recorded', 'name', v_name, 'points', v_points);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_gameify_spend(
  p_reason text,
  p_amount integer,
  p_event_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'America/New_York')::date;
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  IF p_event_date <> v_today THEN RAISE EXCEPTION 'Gameify spends can only be recorded for today' USING ERRCODE = '22023'; END IF;
  IF p_reason NOT IN ('Alcohol', 'Planned Indulgence') THEN RAISE EXCEPTION 'Invalid Gameify spend' USING ERRCODE = '22023'; END IF;
  IF (p_reason = 'Alcohol' AND p_amount <> -4) OR (p_reason = 'Planned Indulgence' AND p_amount <> -2) THEN
    RAISE EXCEPTION 'Invalid Gameify spend amount' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  SELECT COALESCE(SUM(pt.amount), 0)::integer INTO v_balance
  FROM public.point_transactions AS pt WHERE pt.user_id = v_user_id;

  IF v_balance < abs(p_amount) THEN
    RETURN jsonb_build_object('status', 'insufficient_points', 'balance', v_balance, 'required', abs(p_amount));
  END IF;

  INSERT INTO public.point_transactions (user_id, amount, reason, event_date)
  VALUES (v_user_id, p_amount, p_reason, p_event_date);
  RETURN jsonb_build_object('status', 'recorded', 'amount', p_amount, 'balance', v_balance + p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_daily_point(
  p_reason text,
  p_amount integer,
  p_event_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'America/New_York')::date;
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  IF p_event_date <> v_today THEN RAISE EXCEPTION 'Daily points can only be recorded for today' USING ERRCODE = '22023'; END IF;
  IF (p_reason, p_amount) NOT IN (('Daily check-in', 1), ('Gratitude', 1), ('Evening reflection', 2)) THEN
    RAISE EXCEPTION 'Invalid daily point rule' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  INSERT INTO public.point_transactions (user_id, amount, reason, event_date)
  VALUES (v_user_id, p_amount, p_reason, p_event_date)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN RETURN jsonb_build_object('status', 'already_recorded', 'reason', p_reason, 'points', p_amount); END IF;
  RETURN jsonb_build_object('status', 'recorded', 'reason', p_reason, 'points', p_amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_gameify_event(uuid, date) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.record_gameify_spend(text, integer, date) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.record_daily_point(text, integer, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_gameify_event(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_gameify_spend(text, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_point(text, integer, date) TO authenticated;

DROP POLICY IF EXISTS "users own gameify rules" ON public.gameify_rules;
CREATE POLICY "users can read own gameify rules" ON public.gameify_rules FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users own gameify events" ON public.gameify_events;
CREATE POLICY "users can read own gameify events" ON public.gameify_events FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users own transactions" ON public.point_transactions;
CREATE POLICY "users can read own transactions" ON public.point_transactions FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

COMMIT;
