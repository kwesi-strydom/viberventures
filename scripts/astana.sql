-- Additive only. Run within a transaction. The lock serializes event allocation.
SELECT pg_advisory_xact_lock(30092026);
INSERT INTO events(edition,name,slug,description,location,status,start_date,entry_fee_cents,currency)
SELECT (SELECT COALESCE(MAX(edition),0)+1 FROM (SELECT edition FROM events UNION ALL SELECT edition FROM users UNION ALL SELECT edition FROM games) editions),
 'Viber Astana','viber-astana','With Superteam Kazakhstan. 60 minutes to build. 60 seconds to pitch. Founder-life challenges every 10 minutes.',
 'Nur Alem Pavilion · 5th floor · Network School','upcoming','2026-09-30 00:00:00+05',0,'usd'
WHERE NOT EXISTS (SELECT 1 FROM events WHERE slug='viber-astana');
CREATE TABLE IF NOT EXISTS astana_event_state (
 event_id integer PRIMARY KEY REFERENCES events(id),roster_revision integer NOT NULL DEFAULT 0,judging_revision integer NOT NULL DEFAULT 0
);
INSERT INTO astana_event_state(event_id) SELECT id FROM events WHERE slug='viber-astana' ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS astana_teams (
 id uuid PRIMARY KEY,event_id integer NOT NULL REFERENCES events(id),name text NOT NULL,UNIQUE(event_id,name),UNIQUE(event_id,id)
);
CREATE TABLE IF NOT EXISTS astana_guests (
 id uuid PRIMARY KEY,event_id integer NOT NULL REFERENCES events(id),name text NOT NULL,email text NOT NULL,team_id uuid,
 followed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(event_id,email),
 FOREIGN KEY(event_id,team_id) REFERENCES astana_teams(event_id,id)
);
CREATE TABLE IF NOT EXISTS astana_sessions (
 token_hash text PRIMARY KEY,guest_id uuid NOT NULL REFERENCES astana_guests(id),expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS astana_recovery_tokens (
 token_hash text PRIMARY KEY,guest_id uuid NOT NULL REFERENCES astana_guests(id),expires_at timestamptz NOT NULL,consumed_at timestamptz
);
-- Device pairing creates an additional session without invalidating the source device.
CREATE TABLE IF NOT EXISTS astana_device_codes (
 token_hash text PRIMARY KEY,
 guest_id uuid NOT NULL REFERENCES astana_guests(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS astana_device_codes_guest_created ON astana_device_codes(guest_id,created_at);
CREATE TABLE IF NOT EXISTS astana_projects (
 id uuid PRIMARY KEY,event_id integer NOT NULL REFERENCES events(id),team_id uuid NOT NULL UNIQUE,
 title text NOT NULL,description text NOT NULL DEFAULT '',app_url text NOT NULL,thumbnail_url text NOT NULL,social_url text,
 revision integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(event_id,team_id) REFERENCES astana_teams(event_id,id),UNIQUE(event_id,id)
);
CREATE TABLE IF NOT EXISTS astana_visitors(token_hash text PRIMARY KEY,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS astana_ratings (
 project_id uuid NOT NULL REFERENCES astana_projects(id),visitor_hash text NOT NULL REFERENCES astana_visitors(token_hash),
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),PRIMARY KEY(project_id,visitor_hash)
);
CREATE TABLE IF NOT EXISTS astana_winners (
 event_id integer NOT NULL REFERENCES events(id),rank integer NOT NULL CHECK(rank BETWEEN 1 AND 3),
 project_id uuid NOT NULL,stage text NOT NULL CHECK(stage IN ('draft','published')),
 PRIMARY KEY(event_id,stage,rank),UNIQUE(event_id,stage,project_id),
 FOREIGN KEY(event_id,project_id) REFERENCES astana_projects(event_id,id)
);
CREATE INDEX IF NOT EXISTS astana_sessions_guest ON astana_sessions(guest_id);
CREATE INDEX IF NOT EXISTS astana_guests_team ON astana_guests(team_id);
