import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { AstanaStore } from './astana/store';
import { WheelProgressStore, type WheelSqlDatabase } from './wheel-progress';

const astanaGuestIds = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
];
const astanaTeamIds = [
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
];
const requestId = '20000000-0000-4000-8000-000000000001';

test('Astana roster rotation and dispute resolution commit or roll back together', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(`
      CREATE TABLE events (
        id integer PRIMARY KEY, edition integer, name text, slug text,
        location text, status text
      );
      INSERT INTO events VALUES (3, 6, 'Viber Astana', 'viber-astana', 'Astana', 'upcoming');
      CREATE TABLE event_state (id integer PRIMARY KEY, linked_event_id integer);
      INSERT INTO event_state VALUES (1, 3);
      CREATE TABLE dashboard_teams (id serial PRIMARY KEY, name text NOT NULL UNIQUE);
      INSERT INTO dashboard_teams(name) VALUES ('Team A'), ('Team B');
      CREATE TABLE dashboard_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category text NOT NULL,
        type text NOT NULL, label text NOT NULL, team_id integer, team_name text,
        at_seconds integer NOT NULL DEFAULT 0, duration_seconds integer,
        active boolean NOT NULL DEFAULT true, resolved_at timestamptz, result_text text
      );
      CREATE TABLE feed_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL,
        message text NOT NULL, at_seconds integer,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE astana_event_state (
        event_id integer PRIMARY KEY, roster_revision integer NOT NULL DEFAULT 0
      );
      INSERT INTO astana_event_state VALUES (3, 0);
      CREATE TABLE astana_teams (id uuid PRIMARY KEY, event_id integer, name text);
      INSERT INTO astana_teams VALUES
        ('${astanaTeamIds[0]}', 3, 'Team A'),
        ('${astanaTeamIds[1]}', 3, 'Team B');
      CREATE TABLE astana_guests (
        id uuid PRIMARY KEY, event_id integer, name text, email text, team_id uuid
      );
      INSERT INTO astana_guests VALUES
        ('${astanaGuestIds[0]}', 3, 'Builder A', 'a@example.com', '${astanaTeamIds[0]}'),
        ('${astanaGuestIds[1]}', 3, 'Builder B', 'b@example.com', '${astanaTeamIds[1]}');
    `);
    const migration = await readFile(new URL('../scripts/wheel-progress.sql', import.meta.url), 'utf8');
    await pg.exec(migration);
    const asExecutor = (client: any) => ({
      query: async <T = Record<string, unknown>>(sql: string, values: unknown[] = []) =>
        (await client.query(sql, values)).rows as T[],
    });
    const database: WheelSqlDatabase = {
      ...asExecutor(pg),
      transaction: callback => pg.transaction(tx => callback(asExecutor(tx))),
    };
    const wheel = new WheelProgressStore(database);
    const astana = new AstanaStore(database);

    await wheel.commit({
      linkedEventId: 3,
      generation: 0,
      nextOrdinal: 0,
      requestId,
      teamNames: ['Team A', 'Team B'],
      type: 'founders_dispute',
      label: 'Founders Dispute',
      atSeconds: 10,
    });
    const identity = { linkedEventId: 3, generation: 0, requestId };
    const originalRoster = async () => (await pg.query(
      'SELECT id, team_id FROM astana_guests ORDER BY id',
    )).rows;
    const assertOriginalRoster = async () => {
      const roster = await originalRoster();
      assert.deepEqual(roster.map((row: any) => row.team_id), astanaTeamIds);
    };

    await pg.exec(`
      CREATE FUNCTION fail_second_astana_member() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.id = '${astanaGuestIds[1]}' THEN RAISE EXCEPTION 'injected after first participant update'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER fail_second_astana_member
      BEFORE UPDATE ON astana_guests FOR EACH ROW EXECUTE FUNCTION fail_second_astana_member();
    `);
    await assert.rejects(wheel.resolveDispute(identity, (dispute, tx) =>
      astana.rotateGuestsInTransaction(tx, astanaGuestIds, 0, 3, dispute.teamNames),
    ), /injected after first participant update/);
    await assertOriginalRoster();
    assert.equal((await wheel.getPendingDispute(3))?.requestId, requestId);
    await pg.exec('DROP TRIGGER fail_second_astana_member ON astana_guests; DROP FUNCTION fail_second_astana_member();');

    await assert.rejects(wheel.resolveDispute(identity, async (dispute, tx) => {
      await astana.rotateGuestsInTransaction(tx, astanaGuestIds, 0, 3, dispute.teamNames);
      throw new Error('injected after roster rotation before dispute mark');
    }), /injected after roster rotation before dispute mark/);
    await assertOriginalRoster();
    assert.equal((await wheel.getPendingDispute(3))?.requestId, requestId);

    await wheel.resolveDispute(identity, async (dispute, tx) => {
      await astana.rotateGuestsInTransaction(tx, astanaGuestIds, 0, 3, dispute.teamNames);
    });
    const rotated = await originalRoster();
    assert.deepEqual(rotated.map((row: any) => row.team_id), [...astanaTeamIds].reverse());
    assert.equal(await wheel.getPendingDispute(3), null);
    assert.equal((await pg.query('SELECT roster_revision FROM astana_event_state WHERE event_id=3')).rows[0].roster_revision, 1);
    await assert.rejects(
      wheel.resolveDispute(identity, async () => assert.fail('resolved dispute must not rotate again')),
      /already been resolved/,
    );
    assert.deepEqual((await originalRoster()).map((row: any) => row.team_id), [...astanaTeamIds].reverse());
  } finally {
    await pg.close();
  }
});