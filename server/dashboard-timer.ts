import type { RequestHandler } from 'express';
import type { EventState } from '@shared/schema';

export const MAX_TIMER_SECONDS = 7 * 24 * 60 * 60;
type TimerFields = Pick<EventState, 'status' | 'durationSeconds' | 'accumulatedSeconds' | 'startedAt'>;
type TimerUpdates = Partial<TimerFields>;

export class TimerInputError extends Error {}

export function elapsedTimerSeconds(state: TimerFields, now = new Date()): number {
  const running = state.status === 'running' && state.startedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(state.startedAt).getTime()) / 1000))
    : 0;
  return Math.max(0, Math.min(state.durationSeconds, state.accumulatedSeconds + running));
}

/** Only clock fields may change. No launchpad, roster, feed or wheel dependencies. */
export function timerUpdates(state: TimerFields, body: unknown, now = new Date()): TimerUpdates {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TimerInputError('Choose a timer action.');
  }
  const { action, durationSeconds } = body as Record<string, unknown>;
  switch (action) {
    case 'start':
      return state.status === 'running' ? {} : { status: 'running', startedAt: now };
    case 'stop':
      return state.status !== 'running' ? {} : {
        status: 'paused', accumulatedSeconds: elapsedTimerSeconds(state, now), startedAt: null,
      };
    case 'reset':
      return { status: 'idle', accumulatedSeconds: 0, startedAt: null };
    case 'set-duration':
      if (typeof durationSeconds !== 'number' || !Number.isInteger(durationSeconds)
        || durationSeconds < 60 || durationSeconds > MAX_TIMER_SECONDS || durationSeconds % 60 !== 0) {
        throw new TimerInputError('Enter a whole number of minutes between 1 and 10,080.');
      }
      return { durationSeconds };
    default:
      throw new TimerInputError('Unknown timer action. Use start, stop, reset or set-duration.');
  }
}

export interface TimerDatabase {
  transaction<T>(callback: (tx: {
    query<R = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<R[]>;
  }) => Promise<T>): Promise<T>;
}

const stateColumns = `id, status, duration_seconds AS "durationSeconds",
  accumulated_seconds AS "accumulatedSeconds", started_at AS "startedAt",
  linked_event_id AS "linkedEventId", updated_at AS "updatedAt"`;

/** Lock the persisted clock before computing updates, so two operators cannot
 * restore a stale elapsed value after a reset or restart the same running clock. */
export class ManualTimerStore {
  constructor(private readonly database: TimerDatabase, private readonly now = () => new Date()) {}

  async mutate(body: unknown): Promise<{ state: EventState; changed: boolean }> {
    return this.database.transaction(async tx => {
      await tx.query('INSERT INTO event_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
      const [current] = await tx.query<EventState>(`SELECT ${stateColumns} FROM event_state WHERE id = 1 FOR UPDATE`);
      if (!current) throw new Error('Timer state is missing.');
      const updates = timerUpdates(current, body, this.now());
      const entries = Object.entries(updates);
      if (!entries.length) return { state: current, changed: false };
      const columns: Record<string, string> = {
        status: 'status', durationSeconds: 'duration_seconds',
        accumulatedSeconds: 'accumulated_seconds', startedAt: 'started_at',
      };
      const assignments = entries.map(([key], index) => `${columns[key]} = $${index + 1}`);
      const [state] = await tx.query<EventState>(
        `UPDATE event_state SET ${assignments.join(', ')}, updated_at = now() WHERE id = 1 RETURNING ${stateColumns}`,
        entries.map(([, value]) => value),
      );
      return { state, changed: true };
    });
  }
}

export function createDashboardTimerHandler(deps: {
  mutateState: (body: unknown) => Promise<{ state: EventState; changed: boolean }>;
  broadcast: (payload: unknown) => void;
}): RequestHandler {
  return async (req, res) => {
    try {
      const { state, changed } = await deps.mutateState(req.body);
      if (changed) deps.broadcast({ type: 'dashboard_update' });
      res.json(state);
    } catch (error) {
      if (error instanceof TimerInputError) {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error('Manual timer request failed', {
        method: req.method, route: '/api/admin/dashboard/timer',
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      res.status(500).json({ message: 'Unable to update the timer. Try again.' });
    }
  };
}