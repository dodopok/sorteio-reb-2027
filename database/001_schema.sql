CREATE TABLE IF NOT EXISTS reb_event (
  id smallint PRIMARY KEY CHECK (id = 1),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO reb_event (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE reb_event ADD COLUMN IF NOT EXISTS generation integer NOT NULL DEFAULT 1 CHECK (generation > 0);

-- Every mutation checks the generation under the same lock as registration,
-- closing and drawing. An old tab cannot modify a raffle after a reset.
CREATE OR REPLACE FUNCTION reb_assert_generation(p_generation integer, p_exclusive boolean)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_exclusive THEN PERFORM pg_advisory_xact_lock(20261003, 1);
  ELSE PERFORM pg_advisory_xact_lock_shared(20261003, 1); END IF;
  IF (SELECT generation FROM reb_event WHERE id = 1) <> p_generation THEN
    RAISE EXCEPTION 'Raffle reset' USING ERRCODE = 'RE009';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION reb_reset(p_generation integer, p_total bigint, p_winners integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE next_generation integer;
BEGIN
  PERFORM reb_assert_generation(p_generation, true);
  IF (SELECT count(*) FROM reb_participants) <> p_total OR (SELECT count(*) FROM reb_draws) <> p_winners THEN
    RAISE EXCEPTION 'Data changed' USING ERRCODE = 'RE010';
  END IF;
  DELETE FROM reb_draws;
  DELETE FROM reb_participants;
  UPDATE reb_event SET status = 'draft', generation = generation + 1, updated_at = now()
    WHERE id = 1 RETURNING generation INTO next_generation;
  RETURN next_generation;
END;
$$;

CREATE OR REPLACE FUNCTION reb_email_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE WHEN split_part(lower(trim(value)), '@', 2) IN ('gmail.com', 'googlemail.com')
    THEN replace(split_part(split_part(lower(trim(value)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    ELSE lower(trim(value)) END;
$$;

CREATE TABLE IF NOT EXISTS reb_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 3 AND 100),
  email text NOT NULL CHECK (length(email) <= 254),
  email_key text GENERATED ALWAYS AS (reb_email_key(email)) STORED UNIQUE,
  whatsapp text NOT NULL UNIQUE CHECK (whatsapp ~ '^\+55[1-9][0-9]9[0-9]{8}$'),
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  registered_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reb_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  prize_id smallint NOT NULL UNIQUE CHECK (prize_id BETWEEN 1 AND 3),
  participant_id uuid NOT NULL UNIQUE REFERENCES reb_participants(id),
  drawn_at timestamptz NOT NULL DEFAULT now(),
  eligible_count integer NOT NULL CHECK (eligible_count > 0),
  pool_hash text NOT NULL,
  algorithm text NOT NULL DEFAULT 'node-crypto-uint32-rejection-v1'
);

CREATE TABLE IF NOT EXISTS reb_sessions (
  token_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS reb_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS reb_limits_expiry_idx ON reb_limits (expires_at);

CREATE OR REPLACE FUNCTION reb_rate_limit(p_key text, p_limit integer, p_seconds integer)
RETURNS TABLE (allowed boolean, retry_after integer) LANGUAGE plpgsql AS $$
DECLARE r reb_limits;
BEGIN
  INSERT INTO reb_limits AS limits (key, hits, expires_at)
    VALUES (p_key, 1, clock_timestamp() + make_interval(secs => p_seconds))
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN limits.expires_at <= clock_timestamp() THEN 1 ELSE least(limits.hits + 1, p_limit + 1) END,
      expires_at = CASE WHEN limits.expires_at <= clock_timestamp() THEN clock_timestamp() + make_interval(secs => p_seconds) ELSE limits.expires_at END
    RETURNING * INTO r;
  RETURN QUERY SELECT r.hits <= p_limit, greatest(1, ceil(extract(epoch FROM r.expires_at - clock_timestamp()))::integer);
END;
$$;

CREATE OR REPLACE FUNCTION reb_register(p_name text, p_email text, p_whatsapp text, p_consent_version text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Concurrent registrations share a lock; closing takes the exclusive lock.
  -- All registrations in flight finish before the eligible pool is frozen.
  PERFORM pg_advisory_xact_lock_shared(20261003, 1);
  IF (SELECT status FROM reb_event WHERE id = 1) <> 'open' THEN
    RAISE EXCEPTION 'Registrations closed' USING ERRCODE = 'RE001';
  END IF;
  INSERT INTO reb_participants (name, email, whatsapp, consent_version)
    VALUES (p_name, lower(trim(p_email)), p_whatsapp, p_consent_version)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION reb_set_status(p_status text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(20261003, 1);
  IF p_status NOT IN ('open', 'closed') THEN RAISE EXCEPTION 'Invalid state'; END IF;
  IF p_status = 'open' AND EXISTS (SELECT 1 FROM reb_draws) THEN
    RAISE EXCEPTION 'Drawing started' USING ERRCODE = 'RE005';
  END IF;
  IF p_status = 'closed' AND (SELECT count(*) FROM reb_participants) < 3 THEN
    RAISE EXCEPTION 'Need three participants' USING ERRCODE = 'RE006';
  END IF;
  UPDATE reb_event SET status = p_status, updated_at = now() WHERE id = 1;
END;
$$;

CREATE OR REPLACE FUNCTION reb_winner(p_draw_id uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('id', d.id, 'prizeId', d.prize_id, 'name', p.name,
    'drawnAt', d.drawn_at, 'eligibleCount', d.eligible_count, 'poolHash', d.pool_hash)
  FROM reb_draws d JOIN reb_participants p ON p.id = d.participant_id WHERE d.id = p_draw_id;
$$;

CREATE OR REPLACE FUNCTION reb_draw(p_request_id uuid, p_expected_prize integer, p_entropy bytea) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  existing_id uuid;
  candidates uuid[];
  n integer;
  next_prize integer;
  entropy bytea;
  sample bigint;
  ceiling bigint;
  chosen uuid;
  draw_id uuid;
  position integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(20261003, 1);
  SELECT id INTO existing_id FROM reb_draws WHERE request_id = p_request_id;
  IF existing_id IS NOT NULL THEN RETURN reb_winner(existing_id); END IF;
  IF (SELECT status FROM reb_event WHERE id = 1) <> 'closed' THEN
    RAISE EXCEPTION 'Close first' USING ERRCODE = 'RE002';
  END IF;
  SELECT count(*) + 1 INTO next_prize FROM reb_draws;
  IF next_prize > 3 THEN RAISE EXCEPTION 'All drawn' USING ERRCODE = 'RE003'; END IF;
  IF next_prize <> p_expected_prize THEN RAISE EXCEPTION 'Prize already drawn' USING ERRCODE = 'RE007'; END IF;
  SELECT array_agg(p.id ORDER BY p.id) INTO candidates FROM reb_participants p
    WHERE NOT EXISTS (SELECT 1 FROM reb_draws d WHERE d.participant_id = p.id);
  n := coalesce(array_length(candidates, 1), 0);
  IF n = 0 THEN RAISE EXCEPTION 'No participants' USING ERRCODE = 'RE004'; END IF;
  -- Rejection sampling avoids modulo bias. All eligible people have equal odds.
  ceiling := 4294967296::bigint - (4294967296::bigint % n);
  LOOP
    IF position + 4 > length(p_entropy) THEN RAISE EXCEPTION 'Retry entropy sampling' USING ERRCODE = 'RE008'; END IF;
    entropy := substring(p_entropy FROM position + 1 FOR 4);
    position := position + 4;
    sample := get_byte(entropy, 0)::bigint * 16777216 + get_byte(entropy, 1)::bigint * 65536
      + get_byte(entropy, 2)::bigint * 256 + get_byte(entropy, 3)::bigint;
    EXIT WHEN sample < ceiling;
  END LOOP;
  chosen := candidates[(sample % n)::integer + 1];
  INSERT INTO reb_draws (request_id, prize_id, participant_id, eligible_count, pool_hash)
    VALUES (p_request_id, next_prize, chosen, n, encode(sha256(convert_to(array_to_string(candidates, ','), 'UTF8')), 'hex'))
    RETURNING id INTO draw_id;
  RETURN reb_winner(draw_id);
END;
$$;

CREATE OR REPLACE FUNCTION reb_dashboard() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'generation', (SELECT generation FROM reb_event WHERE id = 1),
    'status', (SELECT status FROM reb_event WHERE id = 1),
    'total', (SELECT count(*) FROM reb_participants),
    'eligible', (SELECT count(*) FROM reb_participants p WHERE NOT EXISTS (SELECT 1 FROM reb_draws d WHERE d.participant_id = p.id)),
    'winners', coalesce((SELECT jsonb_agg(reb_winner(d.id) ORDER BY d.prize_id) FROM reb_draws d), '[]'::jsonb),
    'contacts', coalesce((SELECT jsonb_agg(jsonb_build_object('drawId', d.id, 'name', p.name,
      'email', p.email, 'whatsapp', p.whatsapp, 'prizeId', d.prize_id) ORDER BY d.prize_id)
      FROM reb_draws d JOIN reb_participants p ON p.id = d.participant_id), '[]'::jsonb)
  );
$$;

-- No browser receives database credentials. A dedicated DB and server-only role
-- should be used. Functions are SECURITY INVOKER, never SECURITY DEFINER.
REVOKE ALL ON reb_event, reb_participants, reb_draws, reb_sessions, reb_limits FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reb_register(text,text,text,text), reb_draw(uuid,integer,bytea), reb_set_status(text),
  reb_dashboard(), reb_winner(uuid), reb_rate_limit(text,integer,integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reb_assert_generation(integer,boolean), reb_reset(integer,bigint,integer) FROM PUBLIC;
