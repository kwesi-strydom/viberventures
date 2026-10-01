import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canStartWheelSpin,
  createPendingWheelDispute,
  reduceWheelDispute,
  type WheelDisputeContext,
  type WheelDisputeRequest,
} from './wheel-dispute';

const context: WheelDisputeContext = { linkedEventId: 12, generation: 3 };
const request: WheelDisputeRequest = {
  ...context,
  requestId: 'spin-founders',
  nextOrdinal: 0,
  teamNames: ['Alpha', 'Beta', 'Gamma'],
};
const committed = {
  ...context,
  nextOrdinal: 1,
};

test('dispute identity holds an immutable team snapshot and prevents replacing it with another spin', () => {
  const selectedTeams = ['Alpha', 'Beta', 'Gamma'];
  const dispute = createPendingWheelDispute(
    { ...request, teamNames: selectedTeams },
    'committed',
    committed,
  );
  assert.ok(dispute);
  selectedTeams.splice(0, selectedTeams.length, 'Later team A', 'Later team B');
  assert.deepEqual(dispute.teamNames, ['Alpha', 'Beta', 'Gamma']);
  assert.equal(canStartWheelSpin(Boolean(dispute)), false);

  const stateAfterLaterCommit = reduceWheelDispute(dispute, {
    type: 'committed',
    request: {
      ...context,
      requestId: 'spin-later',
      nextOrdinal: 1,
      teamNames: ['Later team A', 'Later team B'],
    },
    resultStatus: 'committed',
    progress: { ...context, nextOrdinal: 2 },
  });
  assert.equal(stateAfterLaterCommit, dispute);
  assert.deepEqual(stateAfterLaterCommit?.teamNames, ['Alpha', 'Beta', 'Gamma']);
});

test('event or server generation changes invalidate countdowns and open disputes', () => {
  const dispute = reduceWheelDispute(null, {
    type: 'committed',
    request,
    resultStatus: 'committed',
    progress: committed,
  });
  assert.ok(dispute);
  const changedGeneration = reduceWheelDispute(dispute, {
    type: 'invalidate',
    context: { linkedEventId: 12, generation: 4 },
  });
  assert.equal(changedGeneration, null);

  const openDispute = { ...dispute, status: 'open' as const };
  assert.equal(reduceWheelDispute(openDispute, {
    type: 'invalidate',
    context: { linkedEventId: 13, generation: 3 },
  }), null);
});

test('an old-generation replay cannot schedule a dispute after wheel reset', () => {
  const oldGenerationReplay = createPendingWheelDispute(
    request,
    'replayed',
    { linkedEventId: 12, generation: 4, nextOrdinal: 1 },
  );
  assert.equal(oldGenerationReplay, null);

  const resolvedReplay = createPendingWheelDispute(
    request,
    'replayed',
    committed,
    { disputeResolved: true },
  );
  assert.equal(resolvedReplay, null);

  // Retrying a committed request in its still-current generation may restore
  // the outstanding dispute after a response was lost.
  const sameGenerationReplay = createPendingWheelDispute(request, 'replayed', committed);
  assert.equal(sameGenerationReplay?.requestId, request.requestId);
});

test('a refreshed page restores the saved affected-team snapshot and countdown', () => {
  const createdAt = new Date(Date.now() - 7_000).toISOString();
  const restored = reduceWheelDispute(null, {
    type: 'restore',
    dispute: { ...request, nextOrdinal: 0, createdAt },
    progress: committed,
    countdownSeconds: 15,
  });
  assert.ok(restored);
  assert.equal(restored.requestId, request.requestId);
  assert.deepEqual(restored.teamNames, request.teamNames);
  assert.equal(restored.status, 'countdown');
  assert.ok(restored.countdownRemaining <= 8 && restored.countdownRemaining >= 0);
});