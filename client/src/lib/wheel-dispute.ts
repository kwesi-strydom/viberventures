export interface WheelDisputeContext {
  linkedEventId: number | null;
  generation: number;
}

export interface WheelDisputeRequest extends WheelDisputeContext {
  requestId: string;
  nextOrdinal: number;
  teamNames: readonly string[];
}

export interface WheelDisputeSnapshot extends WheelDisputeContext {
  requestId: string;
  teamNames: readonly string[];
  createdAt?: string | null;
}

export interface WheelDisputeProgress extends WheelDisputeContext {
  nextOrdinal: number;
}

export interface PendingWheelDispute {
  linkedEventId: number | null;
  generation: number;
  requestId: string;
  teamNames: readonly string[];
  status: 'countdown' | 'open' | 'dismissed';
  countdownRemaining: number;
}

export interface WheelDisputeIdentity extends WheelDisputeContext {
  requestId: string;
}

export type WheelDisputeAction =
  | {
      type: 'committed';
      request: WheelDisputeRequest;
      resultStatus: 'committed' | 'replayed';
      progress: WheelDisputeProgress;
      disputeResolved?: boolean;
      countdownSeconds?: number;
    }
  | {
      type: 'restore';
      dispute: WheelDisputeSnapshot;
      progress: WheelDisputeProgress;
      countdownSeconds?: number;
    }
  | { type: 'tick'; identity: WheelDisputeIdentity; context: WheelDisputeContext }
  | { type: 'open'; identity: WheelDisputeIdentity; context: WheelDisputeContext }
  | { type: 'dismiss'; identity: WheelDisputeIdentity; context: WheelDisputeContext }
  | { type: 'resolve'; identity: WheelDisputeIdentity }
  | { type: 'invalidate'; context: WheelDisputeContext | null }
  | { type: 'clear' };

export function createPendingWheelDispute(
  request: WheelDisputeRequest,
  resultStatus: 'committed' | 'replayed',
  progress: WheelDisputeProgress,
  options: { disputeResolved?: boolean; countdownSeconds?: number } = {},
): PendingWheelDispute | null {
  if (
    options.disputeResolved ||
    request.nextOrdinal !== 0 ||
    request.teamNames.length < 2 ||
    request.linkedEventId !== progress.linkedEventId ||
    request.generation !== progress.generation ||
    progress.nextOrdinal <= request.nextOrdinal ||
    (resultStatus !== 'committed' && resultStatus !== 'replayed')
  ) return null;

  return {
    linkedEventId: request.linkedEventId,
    generation: request.generation,
    requestId: request.requestId,
    teamNames: Object.freeze([...request.teamNames]),
    status: 'countdown',
    countdownRemaining: options.countdownSeconds ?? 15,
  };
}

export function wheelDisputeIdentity(dispute: PendingWheelDispute): WheelDisputeIdentity {
  return {
    linkedEventId: dispute.linkedEventId,
    generation: dispute.generation,
    requestId: dispute.requestId,
  };
}

export function sameWheelDispute(
  dispute: PendingWheelDispute | null,
  identity: WheelDisputeIdentity,
): boolean {
  return Boolean(
    dispute &&
    dispute.linkedEventId === identity.linkedEventId &&
    dispute.generation === identity.generation &&
    dispute.requestId === identity.requestId,
  );
}

export function wheelDisputeMatchesContext(
  dispute: PendingWheelDispute,
  context: WheelDisputeContext | null,
): boolean {
  return Boolean(
    context &&
    dispute.linkedEventId === context.linkedEventId &&
    dispute.generation === context.generation,
  );
}

export function canStartWheelSpin(hasUnresolvedDispute: boolean): boolean {
  return !hasUnresolvedDispute;
}

export function reduceWheelDispute(
  state: PendingWheelDispute | null,
  action: WheelDisputeAction,
): PendingWheelDispute | null {
  switch (action.type) {
    case 'committed':
      if (state) return state;
      return createPendingWheelDispute(action.request, action.resultStatus, action.progress, action);
    case 'restore': {
      const identity = {
        linkedEventId: action.dispute.linkedEventId,
        generation: action.dispute.generation,
        requestId: action.dispute.requestId,
      };
      if (state && sameWheelDispute(state, identity)) return state;
      const request: WheelDisputeRequest = {
        ...action.dispute,
        nextOrdinal: 0,
      };
      const created = createPendingWheelDispute(request, 'committed', action.progress, action);
      if (!created) return null;
      if (action.dispute.createdAt) {
        const createdAtMs = Date.parse(action.dispute.createdAt);
        const ageSeconds = Number.isFinite(createdAtMs)
          ? Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000))
          : 0;
        const remaining = Math.max(0, created.countdownRemaining - ageSeconds);
        return {
          ...created,
          countdownRemaining: remaining,
          status: remaining === 0 ? 'open' : 'countdown',
        };
      }
      return created;
    }
    case 'tick':
      if (!state || !sameWheelDispute(state, action.identity)) return state;
      if (!wheelDisputeMatchesContext(state, action.context)) return null;
      if (state.status !== 'countdown') return state;
      const countdownRemaining = Math.max(0, state.countdownRemaining - 1);
      return { ...state, countdownRemaining, status: countdownRemaining === 0 ? 'open' : 'countdown' };
    case 'open':
      if (!state || !sameWheelDispute(state, action.identity)) return state;
      if (!wheelDisputeMatchesContext(state, action.context)) return null;
      return { ...state, status: 'open' };
    case 'dismiss':
      if (!state || !sameWheelDispute(state, action.identity)) return state;
      if (!wheelDisputeMatchesContext(state, action.context)) return null;
      return { ...state, status: 'dismissed' };
    case 'resolve':
      return sameWheelDispute(state, action.identity) ? null : state;
    case 'invalidate':
      return state && wheelDisputeMatchesContext(state, action.context) ? state : null;
    case 'clear':
      return null;
  }
}