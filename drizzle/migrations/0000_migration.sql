CREATE TABLE public.location_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  contact_name text NOT NULL,
  phone text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  consented_at timestamptz,
  stopped_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_accuracy double precision,
  last_seen_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_requests TO authenticated;
GRANT ALL ON public.location_requests TO service_role;
ALTER TABLE public.location_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own requests" ON public.location_requests FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners create own requests" ON public.location_requests FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND status = 'pending' AND last_lat IS NULL AND consented_at IS NULL);
CREATE POLICY "Owners update own requests" ON public.location_requests FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete own requests" ON public.location_requests FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.location_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.location_requests(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_pings_request_idx ON public.location_pings (request_id, recorded_at DESC);

GRANT SELECT ON public.location_pings TO authenticated;
GRANT ALL ON public.location_pings TO service_role;
ALTER TABLE public.location_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read pings of own requests" ON public.location_pings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.location_requests r WHERE r.id = request_id AND r.owner_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.location_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_pings;