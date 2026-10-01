-- Additive only: preserve participants, teams, projects and existing sessions.
CREATE TABLE IF NOT EXISTS astana_device_codes (
  token_hash text PRIMARY KEY,
  guest_id uuid NOT NULL REFERENCES astana_guests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS astana_device_codes_guest_created
  ON astana_device_codes(guest_id, created_at);