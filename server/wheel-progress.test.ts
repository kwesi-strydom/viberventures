import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { WheelProgressConflict, WheelProgressStore, WHEEL_CHALLENGE_ORDER, type WheelSqlDatabase, type WheelSpinInput } from './wheel-progress';

async function setup() {
  const pg = new PGlite();
  await pg.exec(`
    CREATE TABLE events (id integer PRIMARY KEY);
    INSERT INTO events(id) VALUES (1), (2);
    CREATE TABLE event_state (
      id integer PRIMARY KEY,
      linked_event_id integer,
      status text NOT NULL DEFAULT 'idle',
      duration_seconds integer NOT NULL DEFAULT 3600,
      accumulated_seconds integer NOT NULL DEFAULT 0,
      started_at timestamptz
    );
    INSERT INTO event_state(id, linked_event_id) VALUES (1, 1);
    CREATE TABLE dashboard_teams (id serial PRIMARY KEY, name text NOT NULL UNIQUE);
    INSERT INTO dashboard_teams(name) VALUES ('Team 1'), ('Team 2'), ('Team 3');
    CREATE TABLE dashboard_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      category text NOT NULL, type text NOT NULL, label text NOT NULL,
      team_id integer, team_name text, at_seconds integer NOT NULL DEFAULT 0,
      duration_seconds integer, active boolean NOT NULL DEFAULT true
    );
    CREATE TABLE feed_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind text NOT NULL, message text NOT NULL, at_seconds integer,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  const migration = await readFile(new URL('../scripts/wheel-progress.sql', import.meta.url), 'utf8');
  await pg.exec(migration);
  await pg.exec(migration);
  const asExecutor = (client: any) => ({
    query: async <T = Record<string, unknown>>(sql: string, values: unknown[] = []) =>
      (await client.query(sql, values)).rows as T[],
  });
  const database: WheelSqlDatabase = {
    ...asExecutor(pg),
    transaction: callback => pg.transaction(tx => callback(asExecutor(tx))),
  };
  return { pg, database, store: new WheelProgressStore(database) };
}

const requestId = (index: number) => `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
const spinInput = (
  ordinal: number,
  options: Partial<WheelSpinInput> = {},
): WheelSpinInput => ({
  linkedEventId: 1,
  generation: 0,
  nextOrdinal: ordinal,
  requestId: requestId(ordinal + 1),
  teamNames: ['Team 1', 'Team 2'],
  type: WHEEL_CHALLENGE_ORDER[ordinal].type,
  label: WHEEL_CHALLENGE_ORDER[ordinal].label,
  atSeconds: 120,
  ...options,
});

test('ordered rounds persist through reloads, include safe round, and retries are idempotent', async () => {
  const { pg, database, store } = await setup();
  try {
    assert.deepEqual(await store.get(1), { linkedEventId: 1, generation: 0, nextOrdinal: 0 });
    await assert.rejects(
      store.commit(spinInput(0, { type: 'copyright_strike', label: 'Copyright Strike', requestId: requestId(100) })),
      /does not match the next wheel challenge/,
    );
    assert.equal((await store.get(1)).nextOrdinal, 0);
    for (let ordinal = 0; ordinal < WHEEL_CHALLENGE_ORDER.length; ordinal++) {
      const result = await store.commit(spinInput(ordinal));
      assert.equal(result.status, 'committed');
      assert.equal(result.progress.nextOrdinal, ordinal + 1);

      // A newly constructed reader simulates a full page/server re-read.
      const reloaded = new WheelProgressStore(database);
      assert.equal((await reloaded.get(1)).nextOrdinal, ordinal + 1);
    }

    const retry = await store.commit(spinInput(0));
    assert.equal(retry.status, 'replayed');
    assert.equal(retry.progress.nextOrdinal, 5);
    const events = await pg.query(`SELECT type, wheel_request_id FROM dashboard_events`);
    const feed = await pg.query(`SELECT kind, wheel_request_id FROM feed_events`);
    assert.deepEqual(
      [...new Set(events.rows.map((row: any) => row.type))],
      ['founders_dispute', 'copyright_strike', 'server_crash', 'lawsuit'],
    );
    assert.equal(events.rows.length, 8);
    assert.equal(feed.rows.length, 10); // two affected teams in each of five rounds
    assert.equal((await store.commit(spinInput(4, { nextOrdinal: 5, requestId: requestId(6) }))).status, 'stale');
  } finally {
    await pg.close();
  }
});

test('failed outcome writes roll back both challenge rows and wheel progress; retry can commit', async () => {
  const { pg, store } = await setup();
  try {
    await pg.exec(`
      CREATE FUNCTION reject_second_team_feed() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.message LIKE '%Team 2%' THEN RAISE EXCEPTION 'test feed failure'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER reject_second_team_feed BEFORE INSERT ON feed_events
      FOR EACH ROW EXECUTE FUNCTION reject_second_team_feed();
    `);
    const input = spinInput(0);
    await assert.rejects(store.commit(input), /test feed failure/);
    assert.equal((await store.get(1)).nextOrdinal, 0);
    assert.equal(Number((await pg.query(`SELECT count(*) AS n FROM wheel_spins`)).rows[0].n), 0);
    assert.equal(Number((await pg.query(`SELECT count(*) AS n FROM dashboard_events`)).rows[0].n), 0);
    assert.equal(Number((await pg.query(`SELECT count(*) AS n FROM feed_events`)).rows[0].n), 0);

    await pg.exec('DROP TRIGGER reject_second_team_feed ON feed_events; DROP FUNCTION reject_second_team_feed();');
    const retry = await store.commit(input);
    assert.equal(retry.status, 'committed');
    assert.equal(retry.progress.nextOrdinal, 1);
    assert.equal(Number((await pg.query(`SELECT count(*) AS n FROM dashboard_events`)).rows[0].n), 2);
  } finally {
    await pg.close();
  }
});

test('parallel stale sessions cannot both commit the same ordinal', async () => {
  const { pg, store } = await setup();
  try {
    const [first, second] = await Promise.all([
      store.commit(spinInput(0, { requestId: requestId(11) })),
      store.commit(spinInput(0, { requestId: requestId(12) })),
    ]);
    assert.deepEqual([first.status, second.status].sort(), ['committed', 'stale']);
    assert.equal((await store.get(1)).nextOrdinal, 1);
    assert.equal(Number((await pg.query(`SELECT count(*) AS n FROM wheel_spins`)).rows[0].n), 1);
  } finally {
    await pg.close();
  }
});

test('dispute resolution is event/generation scoped and only commits once', async () => {
  const { pg, store } = await setup();
  try {
    const input = spinInput(0);
    await store.commit(input);
    const pending = await store.getPendingDispute(1);
    assert.equal(pending?.requestId, input.requestId);
    assert.deepEqual(pending?.teamNames, input.teamNames);
    assert.equal(pending?.generation, input.generation);
    const identity = {
      linkedEventId: input.linkedEventId,
      generation: input.generation,
      requestId: input.requestId,
    };
    await pg.query(`UPDATE event_state SET linked_event_id=2 WHERE id=1`);
    await assert.rejects(
      store.resolveDispute(identity, async () => 'should not be applied'),
      (error: unknown) => error instanceof WheelProgressConflict && error.code === 'link-changed',
    );
    await pg.query(`UPDATE event_state SET linked_event_id=1 WHERE id=1`);
    const resolvedTeams = await store.resolveDispute(identity, async dispute => dispute.teamNames);
    assert.deepEqual(resolvedTeams, ['Team 1', 'Team 2']);
    assert.equal(await store.getPendingDispute(1), null);
    const replay = await store.commit(input);
    assert.equal(replay.status, 'replayed');
    if (replay.status === 'replayed') assert.equal(replay.disputeResolved, true);

    await assert.rejects(
      store.resolveDispute(identity, async () => 'should not be applied'),
      (error: unknown) => error instanceof WheelProgressConflict && error.code === 'dispute-resolved',
    );

    await store.reset(1);
    const pendingInput = spinInput(0, { generation: 1, requestId: requestId(31) });
    await store.commit(pendingInput);
    await store.reset(1);
    await assert.rejects(
      store.resolveDispute(
        { linkedEventId: 1, generation: 1, requestId: pendingInput.requestId },
        async () => 'should not be applied',
      ),
      (error: unknown) => error instanceof WheelProgressConflict && error.code === 'dispute-stale',
    );
  } finally {
    await pg.close();
  }
});

test('a Founders Dispute with fewer than two affected teams is not left blocking the wheel', async () => {
  const { pg, store } = await setup();
  try {
    const result = await store.commit(spinInput(0, { teamNames: ['Team 1'] }));
    assert.equal(result.status, 'committed');
    if (result.status === 'committed') assert.equal(result.disputeResolved, true);
    assert.equal(await store.getPendingDispute(1), null);
  } finally {
    await pg.close();
  }
});

test('each linked event has isolated progress and wheel reset touches no timer or unrelated outcomes', async () => {
  const { pg, store } = await setup();
  try {
    await pg.query(`UPDATE event_state SET status='running', duration_seconds=900, accumulated_seconds=42, started_at=now()`);
    await pg.query(
      `INSERT INTO dashboard_events(category,type,label,team_name,at_seconds) VALUES ('challenge','manual','Manual event','Team 3',5)`,
    );
    await pg.query(`INSERT INTO feed_events(kind,message,at_seconds) VALUES ('info','Unrelated announcement',9)`);

    await store.commit(spinInput(0));
    await pg.query(`UPDATE event_state SET linked_event_id=2 WHERE id=1`);
    assert.deepEqual(await store.get(2), { linkedEventId: 2, generation: 0, nextOrdinal: 0 });
    await assert.rejects(
      store.commit(spinInput(1, { requestId: requestId(21) })),
      (error: unknown) => error instanceof WheelProgressConflict && error.code === 'link-changed',
    );
    await store.commit(spinInput(0, { linkedEventId: 2, requestId: requestId(22) }));
    await pg.query(`UPDATE event_state SET linked_event_id=1 WHERE id=1`);

    const reset = await store.reset(1);
    assert.deepEqual(reset, { linkedEventId: 1, generation: 1, nextOrdinal: 0 });
    assert.equal((await store.get(2)).nextOrdinal, 1);
    const dashboardRows = await pg.query(`SELECT label, wheel_request_id FROM dashboard_events`);
    assert.equal(dashboardRows.rows.filter((row: any) => row.label === 'Manual event').length, 1);
    assert.equal(dashboardRows.rows.filter((row: any) => row.wheel_request_id === requestId(22)).length, 2);
    assert.equal(dashboardRows.rows.filter((row: any) => row.wheel_request_id === requestId(1)).length, 0);
    const feedRows = await pg.query(`SELECT message, wheel_request_id FROM feed_events`);
    assert.equal(feedRows.rows.filter((row: any) => row.message === 'Unrelated announcement').length, 1);
    assert.equal(feedRows.rows.filter((row: any) => row.wheel_request_id === requestId(22)).length, 2);
    assert.equal(feedRows.rows.filter((row: any) => row.wheel_request_id === requestId(1)).length, 0);
    const state = (await pg.query(
      `SELECT status, duration_seconds, accumulated_seconds FROM event_state WHERE id=1`,
    )).rows[0] as any;
    assert.deepEqual(state, { status: 'running', duration_seconds: 900, accumulated_seconds: 42 });

    // Late retry from the cleared generation is acknowledged but cannot
    // recreate the deleted dashboard/feed outcomes.
    const lateRetry = await store.commit(spinInput(0));
    assert.equal(lateRetry.status, 'replayed');
    assert.deepEqual(lateRetry.progress, reset);
    assert.equal(Number((await pg.query(`SELECT count(*) AS n FROM dashboard_events`)).rows[0].n), 3);
  } finally {
    await pg.close();
  }
});