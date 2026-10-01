-- Additive wheel state/outcome associations. Run this reviewed migration against
-- the live database before publishing code that uses the Wheel of Destiny APIs.
BEGIN;

CREATE TABLE IF NOT EXISTS wheel_progress (
  scope_key text PRIMARY KEY,
  event_id integer REFERENCES events(id) ON DELETE CASCADE,
  generation integer NOT NULL DEFAULT 0 CHECK (generation >= 0),
  next_ordinal integer NOT NULL DEFAULT 0 CHECK (next_ordinal BETWEEN 0 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope_key = 'legacy' AND event_id IS NULL)
    OR (event_id IS NOT NULL AND scope_key = 'event:' || event_id::text)
  )
);

CREATE TABLE IF NOT EXISTS wheel_spins (
  request_id uuid PRIMARY KEY,
  scope_key text NOT NULL REFERENCES wheel_progress(scope_key) ON DELETE CASCADE,
  generation integer NOT NULL CHECK (generation >= 0),
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 0 AND 4),
  challenge_type text NOT NULL,
  challenge_label text NOT NULL,
  team_names jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_key, generation, ordinal)
);

ALTER TABLE dashboard_events ADD COLUMN IF NOT EXISTS wheel_request_id uuid;
ALTER TABLE feed_events ADD COLUMN IF NOT EXISTS wheel_request_id uuid;
ALTER TABLE wheel_spins ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dashboard_events'::regclass
      AND conname = 'dashboard_events_wheel_request_id_fkey'
  ) THEN
    ALTER TABLE dashboard_events
      ADD CONSTRAINT dashboard_events_wheel_request_id_fkey
      FOREIGN KEY (wheel_request_id) REFERENCES wheel_spins(request_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'feed_events'::regclass
      AND conname = 'feed_events_wheel_request_id_fkey'
  ) THEN
    ALTER TABLE feed_events
      ADD CONSTRAINT feed_events_wheel_request_id_fkey
      FOREIGN KEY (wheel_request_id) REFERENCES wheel_spins(request_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dashboard_events_wheel_request_idx
  ON dashboard_events(wheel_request_id) WHERE wheel_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS feed_events_wheel_request_idx
  ON feed_events(wheel_request_id) WHERE wheel_request_id IS NOT NULL;

COMMIT;