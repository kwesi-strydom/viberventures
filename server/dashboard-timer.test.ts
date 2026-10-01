import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { EventState } from '@shared/schema';
import { PGlite } from '@electric-sql/pglite';
import { createDashboardTimerHandler, timerUpdates, elapsedTimerSeconds, TimerInputError, ManualTimerStore, type TimerDatabase } from './dashboard-timer';

const initial = (): EventState => ({
  id: 1, status: 'idle', durationSeconds: 3600, accumulatedSeconds: 0,
  startedAt: null, linkedEventId: 42, updatedAt: new Date('2026-10-01T10:00:00Z'),
});

test('manual timer starts, stops, resumes and resets only its own clock fields', () => {
  let state = initial();
  const start = new Date('2026-10-01T10:00:00Z');
  state = { ...state, ...timerUpdates(state, { action: 'start' }, start) };
  assert.equal(state.status, 'running');
  assert.equal(elapsedTimerSeconds(state, new Date(start.getTime() + 30000)), 30);
  assert.deepEqual(timerUpdates(state, { action: 'start' }), {});
  state = { ...state, ...timerUpdates(state, { action: 'stop' }, new Date(start.getTime() + 30000)) };
  assert.equal(state.accumulatedSeconds, 30);
  assert.equal(state.status, 'paused');
  assert.equal(state.startedAt, null);
  assert.equal(elapsedTimerSeconds(state, new Date(start.getTime() + 90000)), 30);
  state = { ...state, ...timerUpdates(state, { action: 'start' }, new Date(start.getTime() + 90000)) };
  assert.equal(elapsedTimerSeconds(state, new Date(start.getTime() + 105000)), 45);
  assert.deepEqual(timerUpdates(state, { action: 'reset' }), {
    status: 'idle', accumulatedSeconds: 0, startedAt: null,
  });
  state = { ...state, ...timerUpdates(state, { action: 'reset' }) };
  assert.equal(state.durationSeconds, 3600);
  assert.equal(state.linkedEventId, 42);
  assert.equal(state.accumulatedSeconds, 0);
});

test('presets and custom duration never start or reset the clock; invalid actions are rejected', () => {
  for (const minutes of [5, 10, 60, 137, 10080]) {
    assert.deepEqual(timerUpdates(initial(), { action: 'set-duration', durationSeconds: minutes * 60 }), {
      durationSeconds: minutes * 60,
    });
  }
  for (const durationSeconds of [0, -60, 59, 61, 90, 60.5, 604860, '600', NaN, Infinity]) {
    assert.throws(() => timerUpdates(initial(), { action: 'set-duration', durationSeconds }), TimerInputError);
  }
  for (const action of ['restart', 'end', 'set-event', 'reset-all', 'clear-outcomes', undefined]) {
    assert.throws(() => timerUpdates(initial(), { action }), TimerInputError);
  }
  assert.deepEqual(timerUpdates(initial(), { action: 'stop' }), {});
});

test('reloaded persisted timestamps keep counting; reaching zero never triggers another action', () => {
  const state = { ...initial(), status: 'running', accumulatedSeconds: 15, startedAt: new Date('2026-10-01T10:00:00Z') };
  const reloaded = { ...state, startedAt: new Date(JSON.parse(JSON.stringify(state)).startedAt) };
  assert.equal(elapsedTimerSeconds(reloaded, new Date('2026-10-01T10:00:30Z')), 45);
  assert.equal(elapsedTimerSeconds(reloaded, new Date('2026-10-01T12:00:00Z')), 3600);
  assert.equal(state.status, 'running');
});

test('HTTP timer controls authorize, preserve non-timer data and return clean validation errors', async () => {
  let state = initial();
  const untouched = { teams: ['Team A'], projects: ['Project A'], wheelRound: 3, outcomes: ['dispute'], feed: ['announcement'] };
  const snapshot = structuredClone(untouched);
  let broadcasts = 0;
  const app = express();
  app.use(express.json());
  app.post('/timer', (req, res, next) => {
    if (req.headers['x-test-admin'] !== 'yes') { res.status(401).end(); return; }
    next();
  }, createDashboardTimerHandler({
    mutateState: async body => {
      const updates = timerUpdates(state, body, new Date('2026-10-01T10:00:00Z'));
      state = { ...state, ...updates };
      return { state, changed: Object.keys(updates).length > 0 };
    },
    broadcast: () => { broadcasts++; },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/timer`;
  const post = (body: unknown, authorized = true) => fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(authorized ? { 'x-test-admin': 'yes' } : {}) },
    body: JSON.stringify(body),
  });
  try {
    assert.equal((await post({ action: 'reset' }, false)).status, 401);
    for (const body of [{ action: 'set-duration', durationSeconds: 300 }, { action: 'start' }, { action: 'stop' }, { action: 'reset' }]) {
      assert.equal((await post(body)).status, 200);
    }
    assert.equal(state.durationSeconds, 300);
    assert.equal(state.linkedEventId, 42);
    assert.deepEqual(untouched, snapshot);
    assert.equal(broadcasts, 4);
    assert.equal((await post({ action: 'restart' })).status, 400);
    assert.equal((await post({ action: 'set-duration', durationSeconds: '300oops' })).status, 400);
    assert.equal(broadcasts, 4);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('database timer operations serialize concurrent Starts and Stop/Reset without lost state', async () => {
  const pg = new PGlite();
  await pg.exec(`CREATE TABLE event_state (
    id integer PRIMARY KEY, status text DEFAULT 'idle', duration_seconds integer DEFAULT 3600,
    accumulated_seconds integer DEFAULT 0, started_at timestamptz, linked_event_id integer DEFAULT 42,
    updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE retained_data (kind text PRIMARY KEY, value text);
  INSERT INTO retained_data VALUES ('wheel', 'round3'), ('launchpad', 'seven projects'), ('feed', 'history');`);
  const database: TimerDatabase = {
    transaction: callback => pg.transaction(tx => callback({
      query: async <R,>(sql: string, values?: unknown[]) => (await tx.query<R>(sql, values)).rows,
    })),
  };
  let now = new Date('2026-10-01T10:00:00Z');
  const store = new ManualTimerStore(database, () => new Date(now));
  try {
    const starts = await Promise.all([store.mutate({ action: 'start' }), store.mutate({ action: 'start' })]);
    assert.equal(starts.filter(result => result.changed).length, 1);
    assert.equal(starts[0].state.startedAt?.getTime(), starts[1].state.startedAt?.getTime());
    now = new Date('2026-10-01T10:01:30Z');
    await Promise.all([store.mutate({ action: 'reset' }), store.mutate({ action: 'stop' })]);
    const { state } = await store.mutate({ action: 'stop' });
    assert.equal(state.status, 'idle');
    assert.equal(state.accumulatedSeconds, 0);
    assert.equal(state.startedAt, null);
    assert.equal(state.durationSeconds, 3600);
    assert.equal(state.linkedEventId, 42);
    assert.equal((await pg.query('SELECT * FROM retained_data')).rows.length, 3);
    const countBefore = (await pg.query('SELECT count(*)::int AS count FROM event_state')).rows[0];
    await assert.rejects(store.mutate({ action: 'restart' }), TimerInputError);
    assert.deepEqual((await pg.query('SELECT count(*)::int AS count FROM event_state')).rows[0], countBefore);
  } finally {
    await pg.close();
  }
});