import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { readFile } from 'node:fs/promises';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error('A configured database is required.');
const pool = new Pool({ connectionString });

// Verify the established event database without exposing credentials or identities.
const inventory = `SELECT
  (SELECT count(*)::int FROM events WHERE id IN (SELECT event_id FROM astana_event_state)) AS astana_events,
  (SELECT count(*)::int FROM users) AS platform_users,
  (SELECT count(*)::int FROM astana_guests) AS astana_guests,
  (SELECT count(*)::int FROM astana_teams) AS astana_teams,
  (SELECT count(*)::int FROM astana_projects) AS astana_projects,
  (SELECT count(*)::int FROM dashboard_events) AS dashboard_outcomes,
  (SELECT count(*)::int FROM feed_events) AS feed_entries`;

try {
  const before = (await pool.query(inventory)).rows[0];
  if (before.astana_events < 1) throw new Error('Expected the existing Astana event database; refusing migration.');
  console.log('Existing database inventory:', before);
  // Deliberately do not re-run Astana event seeding or use a schema push.
  await pool.query(await readFile(new URL('./wheel-progress.sql', import.meta.url), 'utf8'));
  await pool.query(await readFile(new URL('./astana-device-codes.sql', import.meta.url), 'utf8'));
  const after = (await pool.query(inventory)).rows[0];
  console.log('Database inventory after additive migration:', after);
  for (const key of Object.keys(before)) {
    if (after[key] < before[key]) throw new Error(`Existing ${key} count decreased; investigate concurrent changes.`);
  }
  console.log('Wheel persistence and device-code tables are ready. Existing records preserved.');
} finally {
  await pool.end();
}