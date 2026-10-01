export interface WheelSqlExecutor {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<T[]>;
}

export interface WheelSqlDatabase extends WheelSqlExecutor {
  transaction<T>(callback: (tx: WheelSqlExecutor) => Promise<T>): Promise<T>;
}

export interface WheelProgress {
  linkedEventId: number | null;
  generation: number;
  nextOrdinal: number;
}

export interface WheelSpinInput extends WheelProgress {
  requestId: string;
  teamNames: string[];
  type: string;
  label: string;
  atSeconds: number;
}

export interface WheelDisputeIdentity {
  linkedEventId: number | null;
  generation: number;
  requestId: string;
}

export interface WheelDisputeSnapshot extends WheelDisputeIdentity {
  nextOrdinal: 0;
  teamNames: string[];
  createdAt: string;
}

export const WHEEL_CHALLENGE_ORDER = [
  { type: 'founders_dispute', label: 'Founders Dispute' },
  { type: 'copyright_strike', label: 'Copyright Strike' },
  { type: 'server_crash', label: 'Server Crash' },
  { type: 'lawsuit', label: 'Lawsuit' },
  { type: 'safe_round', label: 'Safe' },
] as const;

export type WheelSpinResult =
  | { status: 'committed' | 'replayed'; progress: WheelProgress; ordinal: number; disputeResolved?: boolean }
  | { status: 'stale'; progress: WheelProgress; message: string };

export class WheelProgressConflict extends Error {
  constructor(
    message: string,
    readonly code: 'link-changed' | 'request-id-reused' | 'dispute-stale' | 'dispute-resolved',
  ) {
    super(message);
    this.name = 'WheelProgressConflict';
  }
}

type ProgressRow = {
  event_id: number | null;
  generation: number;
  next_ordinal: number;
};

type SpinRow = {
  request_id: string;
  scope_key: string;
  generation: number;
  ordinal: number;
  dispute_resolved_at?: string | Date | null;
  team_names?: string[] | string;
  created_at?: string | Date;
};

type TeamRow = { id: number; name: string };

export function wheelScopeKey(eventId: number | null): string {
  return eventId === null ? 'legacy' : `event:${eventId}`;
}

function toProgress(eventId: number | null, row: ProgressRow): WheelProgress {
  return {
    linkedEventId: eventId,
    generation: Number(row.generation),
    nextOrdinal: Number(row.next_ordinal),
  };
}

export class WheelProgressStore {
  constructor(private readonly database: WheelSqlDatabase) {}

  async get(eventId: number | null): Promise<WheelProgress> {
    const scopeKey = wheelScopeKey(eventId);
    await this.database.query(
      `INSERT INTO wheel_progress (scope_key, event_id)
       VALUES ($1, $2) ON CONFLICT (scope_key) DO NOTHING`,
      [scopeKey, eventId],
    );
    const rows = await this.database.query<ProgressRow>(
      `SELECT event_id, generation, next_ordinal FROM wheel_progress WHERE scope_key = $1`,
      [scopeKey],
    );
    if (!rows[0]) throw new Error('Wheel progress row was not created');
    if (rows[0].event_id !== eventId) throw new Error('Wheel progress scope no longer matches the linked event');
    return toProgress(eventId, rows[0]);
  }

  async getPendingDispute(eventId: number | null): Promise<WheelDisputeSnapshot | null> {
    const rows = await this.database.query<SpinRow>(
      `SELECT s.request_id, s.scope_key, s.generation, s.ordinal, s.team_names, s.created_at
       FROM wheel_spins s
       JOIN wheel_progress p ON p.scope_key = s.scope_key
       WHERE s.scope_key = $1 AND s.generation = p.generation
         AND s.ordinal = 0 AND s.challenge_type = 'founders_dispute'
         AND s.dispute_resolved_at IS NULL
         AND jsonb_array_length(s.team_names) >= 2
       LIMIT 1`,
      [wheelScopeKey(eventId)],
    );
    const row = rows[0];
    if (!row) return null;
    const teamNames = Array.isArray(row.team_names)
      ? row.team_names
      : typeof row.team_names === 'string'
        ? JSON.parse(row.team_names)
        : [];
    const createdAt = row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at ?? Date.now()).toISOString();
    return {
      linkedEventId: eventId,
      generation: Number(row.generation),
      requestId: row.request_id,
      nextOrdinal: 0,
      teamNames,
      createdAt,
    };
  }

  async resolveDispute<T>(
    identity: WheelDisputeIdentity,
    resolve: (dispute: WheelDisputeSnapshot, tx: WheelSqlExecutor) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async tx => {
      const scopeKey = wheelScopeKey(identity.linkedEventId);
      await this.assertLinkedEvent(tx, identity.linkedEventId, true);
      const progressRows = await tx.query<ProgressRow>(
        `SELECT event_id, generation, next_ordinal
         FROM wheel_progress WHERE scope_key = $1 FOR UPDATE`,
        [scopeKey],
      );
      const progress = progressRows[0];
      if (
        !progress ||
        progress.event_id !== identity.linkedEventId ||
        Number(progress.generation) !== identity.generation ||
        Number(progress.next_ordinal) < 1
      ) {
        throw new WheelProgressConflict(
          'This Founders Dispute belongs to an earlier wheel generation or event. Refresh the wheel.',
          'dispute-stale',
        );
      }
      const spinRows = await tx.query<SpinRow>(
        `SELECT request_id, scope_key, generation, ordinal, team_names, created_at, dispute_resolved_at
         FROM wheel_spins
         WHERE request_id = $1 AND scope_key = $2 AND generation = $3
           AND ordinal = 0 AND challenge_type = 'founders_dispute'
         FOR UPDATE`,
        [identity.requestId, scopeKey, identity.generation],
      );
      const spin = spinRows[0];
      if (!spin) {
        throw new WheelProgressConflict('The Founders Dispute result could not be found for this wheel generation.', 'dispute-stale');
      }
      if (spin.dispute_resolved_at) {
        throw new WheelProgressConflict('This Founders Dispute has already been resolved.', 'dispute-resolved');
      }
      const teamNames = Array.isArray(spin.team_names)
        ? spin.team_names
        : typeof spin.team_names === 'string'
          ? JSON.parse(spin.team_names)
          : [];
      const createdAt = spin.created_at instanceof Date
        ? spin.created_at.toISOString()
        : new Date(spin.created_at ?? Date.now()).toISOString();
      const result = await resolve({
        linkedEventId: identity.linkedEventId,
        generation: identity.generation,
        requestId: identity.requestId,
        nextOrdinal: 0,
        teamNames,
        createdAt,
      }, tx);
      const resolved = await tx.query<{ request_id: string }>(
        `UPDATE wheel_spins SET dispute_resolved_at = now()
         WHERE request_id = $1 AND dispute_resolved_at IS NULL
         RETURNING request_id`,
        [identity.requestId],
      );
      if (!resolved[0]) {
        throw new WheelProgressConflict('This Founders Dispute was already resolved.', 'dispute-resolved');
      }
      return result;
    });
  }

  async commit(input: WheelSpinInput): Promise<WheelSpinResult> {
    const scopeKey = wheelScopeKey(input.linkedEventId);
    return this.database.transaction(async tx => {
      await this.assertLinkedEvent(tx, input.linkedEventId);
      await tx.query(
        `INSERT INTO wheel_progress (scope_key, event_id)
         VALUES ($1, $2) ON CONFLICT (scope_key) DO NOTHING`,
        [scopeKey, input.linkedEventId],
      );
      const progressRows = await tx.query<ProgressRow>(
        `SELECT event_id, generation, next_ordinal
         FROM wheel_progress WHERE scope_key = $1 FOR UPDATE`,
        [scopeKey],
      );
      const row = progressRows[0];
      if (!row || row.event_id !== input.linkedEventId) {
        throw new WheelProgressConflict('The linked event changed. Refresh wheel progress before spinning.', 'link-changed');
      }
      const progress = toProgress(input.linkedEventId, row);

      const priorRows = await tx.query<SpinRow>(
        `SELECT request_id, scope_key, generation, ordinal, dispute_resolved_at FROM wheel_spins WHERE request_id = $1`,
        [input.requestId],
      );
      if (priorRows[0]) {
        if (priorRows[0].scope_key !== scopeKey) {
          throw new WheelProgressConflict('This spin request was already used for a different event.', 'request-id-reused');
        }
        // A retry after a lost response is a success even if the wheel was reset
        // later. Return current state, not the old committed ordinal.
        return {
          status: 'replayed',
          progress,
          ordinal: Number(priorRows[0].ordinal),
          disputeResolved: Boolean(priorRows[0].dispute_resolved_at),
        };
      }

      if (progress.generation !== input.generation || progress.nextOrdinal !== input.nextOrdinal) {
        return {
          status: 'stale',
          progress,
          message: 'Another wheel session advanced the challenge. Progress has been refreshed.',
        };
      }
      if (input.nextOrdinal < 0 || input.nextOrdinal >= 5) {
        return { status: 'stale', progress, message: 'All five challenges have been completed. Reset the wheel to start again.' };
      }
      const challenge = WHEEL_CHALLENGE_ORDER[input.nextOrdinal];
      if (input.type !== challenge.type || input.label !== challenge.label) {
        throw new Error('The requested challenge does not match the next wheel challenge');
      }
      if (!input.teamNames.length || input.teamNames.length > 3 || new Set(input.teamNames).size !== input.teamNames.length) {
        throw new Error('A spin must include between one and three distinct teams');
      }

      const teamRows = await tx.query<TeamRow>(
        `SELECT id, name FROM dashboard_teams WHERE name = ANY($1::text[]) FOR KEY SHARE`,
        [input.teamNames],
      );
      const byName = new Map(teamRows.map(team => [team.name, team]));
      if (input.teamNames.some(name => !byName.has(name))) {
        return {
          status: 'stale',
          progress,
          message: 'The team roster changed. Refresh the wheel before spinning again.',
        };
      }

      await tx.query(
        `INSERT INTO wheel_spins
          (request_id, scope_key, generation, ordinal, challenge_type, challenge_label, team_names, dispute_resolved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb,
           CASE WHEN $5 = 'founders_dispute' AND jsonb_array_length($7::jsonb) < 2 THEN now() ELSE NULL END)`,
        [
          input.requestId,
          scopeKey,
          input.generation,
          input.nextOrdinal,
          input.type,
          input.label,
          JSON.stringify(input.teamNames),
        ],
      );

      for (const name of input.teamNames) {
        if (input.type === 'safe_round') {
          await tx.query(
            `INSERT INTO feed_events (kind, message, at_seconds, wheel_request_id)
             VALUES ('info', $1, $2, $3)`,
            [`🛡️ ${name} is safe this round.`, input.atSeconds, input.requestId],
          );
          continue;
        }

        const team = byName.get(name)!;
        await tx.query(
          `INSERT INTO dashboard_events
            (category, type, label, team_id, team_name, at_seconds, duration_seconds, active, wheel_request_id)
           VALUES ('challenge', $1, $2, $3, $4, $5, NULL, TRUE, $6)`,
          [input.type, input.label, team.id, team.name, input.atSeconds, input.requestId],
        );
        await tx.query(
          `INSERT INTO feed_events (kind, message, at_seconds, wheel_request_id)
           VALUES ('challenge', $1, $2, $3)`,
          [`⚡ ${input.label} hits ${team.name}!`, input.atSeconds, input.requestId],
        );
      }

      // Hold the shared dashboard-state row only at the end: timer writes can
      // continue independently while the wheel writes its challenge outcomes.
      await this.assertLinkedEvent(tx, input.linkedEventId, true);
      const updatedRows = await tx.query<ProgressRow>(
        `UPDATE wheel_progress
         SET next_ordinal = next_ordinal + 1, updated_at = now()
         WHERE scope_key = $1
         RETURNING event_id, generation, next_ordinal`,
        [scopeKey],
      );
      return {
        status: 'committed',
        progress: toProgress(input.linkedEventId, updatedRows[0]),
        ordinal: input.nextOrdinal,
        disputeResolved: input.type === 'founders_dispute' && input.teamNames.length < 2,
      };
    });
  }

  async reset(eventId: number | null): Promise<WheelProgress> {
    const scopeKey = wheelScopeKey(eventId);
    return this.database.transaction(async tx => {
      await this.assertLinkedEvent(tx, eventId);
      await tx.query(
        `INSERT INTO wheel_progress (scope_key, event_id)
         VALUES ($1, $2) ON CONFLICT (scope_key) DO NOTHING`,
        [scopeKey, eventId],
      );
      const rows = await tx.query<ProgressRow>(
        `SELECT event_id, generation, next_ordinal
         FROM wheel_progress WHERE scope_key = $1 FOR UPDATE`,
        [scopeKey],
      );
      const current = rows[0];
      if (!current || current.event_id !== eventId) {
        throw new WheelProgressConflict('The linked event changed. Refresh wheel progress before resetting.', 'link-changed');
      }

      await tx.query(
        `DELETE FROM dashboard_events
         WHERE wheel_request_id IN (
           SELECT request_id FROM wheel_spins WHERE scope_key = $1
         )`,
        [scopeKey],
      );
      await tx.query(
        `DELETE FROM feed_events
         WHERE wheel_request_id IN (
           SELECT request_id FROM wheel_spins WHERE scope_key = $1
         )`,
        [scopeKey],
      );
      await this.assertLinkedEvent(tx, eventId, true);
      const updated = await tx.query<ProgressRow>(
        `UPDATE wheel_progress
         SET generation = generation + 1, next_ordinal = 0, updated_at = now()
         WHERE scope_key = $1
         RETURNING event_id, generation, next_ordinal`,
        [scopeKey],
      );
      return toProgress(eventId, updated[0]);
    });
  }

  private async assertLinkedEvent(
    tx: WheelSqlExecutor,
    eventId: number | null,
    lock = false,
  ): Promise<void> {
    const rows = await tx.query<{ linked_event_id: number | null }>(
      `SELECT linked_event_id FROM event_state WHERE id = 1${lock ? ' FOR SHARE' : ''}`,
    );
    if (!rows[0] || rows[0].linked_event_id !== eventId) {
      throw new WheelProgressConflict('The linked event changed. Refresh wheel progress before continuing.', 'link-changed');
    }
  }
}