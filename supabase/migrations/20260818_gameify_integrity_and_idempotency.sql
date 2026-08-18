BEGIN;

-- Journaling is now awarded by the Evening Journal workflow, not manually in Momentum.
UPDATE public.gameify_rules
SET active = false
WHERE name = 'Journaling' AND active = true;

-- Normalize one-time rewards to the app's authoritative local calendar date.
UPDATE public.point_transactions
SET event_date = local_event_date
WHERE event_date IS NULL
  AND reason IN ('Evening reflection', 'Gratitude');

CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_evening_reflection_unique
  ON public.point_transactions (user_id, reason, event_date)
  WHERE reason = 'Evening reflection' AND event_date IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_gratitude_unique
  ON public.point_transactions (user_id, reason, event_date)
  WHERE reason = 'Gratitude' AND event_date IS NOT NULL;

-- Atomic, idempotent earning: the event and its point transaction succeed or fail together.
CREATE OR REPLACE FUNCTION public.record_gameify_event(
  p_rule_id uuid,
  p_event_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
  v_points integer;
  v_event_id uuid;
  v_transaction_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT name, points
  INTO v_name, v_points
  FROM public.gameify_rules
  WHERE id = p_rule_id
    AND user_id = v_user_id
    AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gameify rule not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.gameify_events (user_id, rule_id, event_date, points)
  VALUES (v_user_id, p_rule_id, p_event_date, v_points)
  ON CONFLICT (user_id, rule_id, event_date) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT id INTO v_transaction_id
    FROM public.point_transactions
    WHERE user_id = v_user_id
      AND reason = v_name
      AND event_date = p_event_date
    ORDER BY created_at DESC
    LIMIT 1;

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

GRANT EXECUTE ON FUNCTION public.record_gameify_event(uuid, date) TO authenticated;

-- Atomic spending: serialize a user's balance check so two fast taps cannot overspend.
CREATE OR REPLACE FUNCTION public.record_gameify_spend(
  p_reason text,
  p_amount integer,
  p_event_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_amount >= 0 THEN
    RAISE EXCEPTION 'Spend amount must be negative' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_balance
  FROM public.point_transactions
  WHERE user_id = v_user_id;

  IF v_balance < abs(p_amount) THEN
    RETURN jsonb_build_object(
      'status', 'insufficient_points',
      'balance', v_balance,
      'required', abs(p_amount)
    );
  END IF;

  INSERT INTO public.point_transactions (user_id, amount, reason, event_date)
  VALUES (v_user_id, p_amount, p_reason, p_event_date);

  RETURN jsonb_build_object(
    'status', 'recorded',
    'amount', p_amount,
    'balance', v_balance + p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_gameify_spend(text, integer, date) TO authenticated;

COMMIT;
