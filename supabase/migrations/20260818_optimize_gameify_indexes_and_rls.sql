BEGIN;

CREATE INDEX IF NOT EXISTS gameify_rules_user_id_idx
  ON public.gameify_rules (user_id);

CREATE INDEX IF NOT EXISTS gameify_events_rule_id_idx
  ON public.gameify_events (rule_id);

CREATE INDEX IF NOT EXISTS point_transactions_user_id_idx
  ON public.point_transactions (user_id);

DROP POLICY IF EXISTS "users own gameify rules" ON public.gameify_rules;
CREATE POLICY "users own gameify rules"
  ON public.gameify_rules
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users own gameify events" ON public.gameify_events;
CREATE POLICY "users own gameify events"
  ON public.gameify_events
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users own transactions" ON public.point_transactions;
CREATE POLICY "users own transactions"
  ON public.point_transactions
  FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

COMMIT;
