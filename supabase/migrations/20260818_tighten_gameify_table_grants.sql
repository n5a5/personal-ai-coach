BEGIN;
REVOKE ALL ON TABLE public.point_transactions FROM anon, authenticated;
REVOKE ALL ON TABLE public.gameify_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.gameify_rules FROM anon, authenticated;
GRANT SELECT ON TABLE public.point_transactions TO authenticated;
GRANT SELECT ON TABLE public.gameify_events TO authenticated;
GRANT SELECT ON TABLE public.gameify_rules TO authenticated;
COMMIT;
