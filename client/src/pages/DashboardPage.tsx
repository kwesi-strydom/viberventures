import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radio, Shield, Zap, Scale, Copyright, Users, Target, Trophy,
  Activity, Clock, Megaphone, Rocket, TrendingUp,
} from 'lucide-react';
import type { DashboardSnapshot, DashboardTeam, DashboardEvent, FeedEvent, EventState } from '@shared/schema';

// ── helpers ──────────────────────────────────────────────────────────────────

function computeElapsed(event: EventState, now: number) {
  let elapsed = event.accumulatedSeconds;
  if (event.status === 'running' && event.startedAt) {
    elapsed += Math.floor((now - new Date(event.startedAt).getTime()) / 1000);
  }
  return Math.max(0, Math.min(elapsed, event.durationSeconds));
}

function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function fmtTimeOfDay(date: string | Date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const CHALLENGE_ICONS: Record<string, typeof Zap> = {
  founders_dispute: Users,
  server_crash: Zap,
  lawsuit: Scale,
  copyright_strike: Copyright,
  safe_round: Shield,
  side_quest: Target,
  custom: Activity,
};

function challengeIcon(type: string) {
  return CHALLENGE_ICONS[type] ?? Activity;
}

const FEED_ACCENT: Record<string, string> = {
  challenge: 'text-red-400',
  side_quest: 'text-[color:var(--accent)]',
  deploy: 'text-emerald-400',
  market: 'text-cyan-400',
  announcement: 'text-[color:var(--accent)]',
  info: 'text-ink-300',
};

// ── page ─────────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const { data, isLoading } = useQuery<DashboardSnapshot>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 5000,
  });

  // Tick every second so timers and countdowns animate smoothly.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Radio size={32} className="animate-pulse text-[color:var(--accent)]" />
        <span className="kicker">Connecting to the arena…</span>
      </div>
    );
  }

  const { event, teams, events, feed } = data;
  const elapsed = computeElapsed(event, now);
  const remaining = event.durationSeconds - elapsed;
  const pct = event.durationSeconds > 0 ? Math.min(100, (elapsed / event.durationSeconds) * 100) : 0;
  const isLive = event.status === 'running';

  // Show ongoing calamities/quests first, then ones the operator has cleared, so the
  // status lifecycle (ongoing → resolved) stays visible until the board is reset.
  const sortActiveFirst = (a: DashboardEvent, b: DashboardEvent) =>
    Number(b.active) - Number(a.active) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const challengeCards = events.filter((e) => e.category === 'challenge').sort(sortActiveFirst);
  const sideQuestCards = events.filter((e) => e.category === 'side_quest').sort(sortActiveFirst);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Hero timer */}
      <HeroTimer event={event} remaining={remaining} elapsed={elapsed} pct={pct} isLive={isLive} events={events} />

      {/* Quest Timeline + Prediction Market */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <QuestTimeline teams={teams} events={events} durationSeconds={event.durationSeconds} elapsedPct={pct} />
        </div>
        <div className="lg:col-span-1">
          <PredictionMarket />
        </div>
      </div>

      {/* Active Event Cards */}
      <ActiveEventCards challenges={challengeCards} sideQuests={sideQuestCards} now={now} />

      {/* Live Feed */}
      <LiveFeed feed={feed} />
    </div>
  );
};

// ── hero timer ───────────────────────────────────────────────────────────────

const HeroTimer = ({ event, remaining, elapsed, pct, isLive, events }: {
  event: EventState; remaining: number; elapsed: number; pct: number; isLive: boolean; events: DashboardEvent[];
}) => {
  const duration = event.durationSeconds;
  const overtime = remaining <= 0 && event.status !== 'idle';

  const headline =
    event.status === 'idle' ? 'Ready to battle?' :
    event.status === 'ended' ? 'Time’s up!' :
    event.status === 'paused' ? 'Battle paused' :
    'Battle in progress';
  const subline =
    event.status === 'idle' ? 'The clock starts when the operator hits go.' :
    event.status === 'ended' ? 'Builders, down tools — final standings below.' :
    'Ship fast. Survive the Wheel. Claim the crown.';

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.13]"
        style={{ background: 'radial-gradient(circle at 50% -25%, var(--accent), transparent 60%)' }} />
      <div className="relative px-5 pt-6 pb-6 flex flex-col items-center text-center">
        <div className="w-full flex items-center justify-between mb-1">
          <p className="kicker">Viber Live Arena</p>
          {isLive ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-red-600 text-white text-xs font-mono uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Live
            </span>
          ) : (
            <span className="mono-label">{event.status}</span>
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{headline}</h2>
        <p className="text-sm text-ink-300">{subline}</p>

        {/* giant clock */}
        <div className="font-mono font-black tabular-nums leading-[0.85] select-none my-2"
          style={{
            fontSize: 'clamp(5rem, 17vw, 12rem)',
            color: overtime ? '#ef4444' : 'var(--ink-000, #fff)',
            textShadow: isLive ? '0 0 55px var(--accent-soft), 0 0 16px var(--accent-soft)' : 'none',
          }}>
          {fmtClock(remaining)}
        </div>
        <p className="mono-label mb-6">{overtime ? 'Overtime' : 'Time left'}</p>

        {/* competition timeline */}
        <GlobalTimeline duration={duration} pct={pct} elapsed={elapsed} events={events} status={event.status} />
      </div>
    </div>
  );
};

// Landing-page timeline palette, reused so the dashboard timeline matches the home page.
const CORAL = '#F25C5C';
const TEAL = '#2FC4C4';

const GlobalTimeline = ({ duration, pct, elapsed, events, status }: {
  duration: number; pct: number; elapsed: number; events: DashboardEvent[]; status: string;
}) => {
  const [openCluster, setOpenCluster] = useState<number | null>(null);

  // Only reveal events the clock has actually reached — they appear live as they happen.
  const revealed = events
    .filter((e) => e.atSeconds >= 0 && e.atSeconds <= elapsed + 1)
    .sort((a, b) => a.atSeconds - b.atSeconds);

  // Group events that fired at the same moment (e.g. one Wheel spin hitting several teams)
  // into a single marker so they don't overlap into an unreadable pile.
  const clusters = Array.from(
    revealed.reduce((map, ev) => {
      const arr = map.get(ev.atSeconds) ?? [];
      arr.push(ev);
      map.set(ev.atSeconds, arr);
      return map;
    }, new Map<number, DashboardEvent[]>()).entries()
  ).map(([atSeconds, items]) => ({ atSeconds, items }));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-xs font-mono text-ink-400">0:00</span>
        <span className="mono-label">Competition timeline</span>
        <span className="text-xs font-mono text-ink-400">{fmtClock(duration)}</span>
      </div>

      {/* Dark "founder journey" board, styled to match the landing-page timeline.
          Overflow stays visible so gate popovers can escape above the board. */}
      <div
        className="relative h-28 rounded-[20px] border border-ink-600 px-5"
        style={{ background: 'radial-gradient(900px 280px at 96% 0%, rgba(47,196,196,0.08), transparent 60%), var(--ink-850)' }}
      >
        {/* the rail */}
        <div className="absolute left-5 right-5 bottom-7 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          {/* elapsed fill */}
          <div className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, rgba(249,168,38,0.15), var(--accent))' }} />
          {/* glowing playhead dot */}
          {status !== 'idle' && (
            <div className="absolute top-1/2 z-30 transition-[left] duration-1000 ease-linear" style={{ left: `${pct}%` }}>
              <span className="block w-3.5 h-3.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{ background: 'var(--accent)', boxShadow: '0 0 0 4px rgba(255,255,255,0.06), 0 0 18px 2px var(--accent)' }} />
            </div>
          )}
        </div>

        {/* finish gate */}
        <div className="absolute top-5 bottom-7 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none" style={{ left: '99%' }}>
          <span className="order-[-1] font-mono uppercase text-center leading-tight"
            style={{ fontSize: '10.5px', letterSpacing: '0.06em', color: TEAL }}>Finish</span>
          <span className="flex-1 w-[3px] rounded"
            style={{ background: 'linear-gradient(180deg, rgba(47,196,196,0.7), rgba(47,196,196,0.15))' }} />
        </div>

        {/* vertical challenge gates */}
        {clusters.map(({ atSeconds, items }) => {
          const left = duration > 0 ? Math.min(100, (atSeconds / duration) * 100) : 0;
          const isChallenge = items.some((m) => m.category === 'challenge');
          const isOpen = openCluster === atSeconds;
          const gateColor = isChallenge ? CORAL : 'var(--accent)';
          const tick = isChallenge
            ? 'repeating-linear-gradient(180deg, rgba(242,92,92,0.65) 0 6px, transparent 6px 12px)'
            : 'repeating-linear-gradient(180deg, rgba(249,168,38,0.6) 0 6px, transparent 6px 12px)';
          // Keep the popover on-screen near the edges of the board.
          const align = left < 14 ? 'left' : left > 86 ? 'right' : 'center';
          const popPos =
            align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
          return (
            <div key={atSeconds}
              className="absolute top-5 bottom-7 -translate-x-1/2 w-6 group z-20"
              style={{ left: `${left}%` }}>
              {/* clickable gate: label on top + dashed tick down to the rail */}
              <button type="button"
                onClick={() => setOpenCluster(isOpen ? null : atSeconds)}
                aria-label={`${items.length} event${items.length > 1 ? 's' : ''} at ${fmtClock(atSeconds)}`}
                className="w-full h-full flex flex-col items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded">
                <span className="order-[-1] font-mono uppercase text-center leading-tight"
                  style={{ fontSize: '10.5px', letterSpacing: '0.06em', maxWidth: '92px', color: gateColor }}>
                  {items[0].label}{items.length > 1 ? ` +${items.length - 1}` : ''}
                </span>
                <span className="flex-1 w-0.5 rounded transition-all group-hover:w-[3px]" style={{ background: tick }} />
              </button>

              {/* popover — visible on hover, or pinned on click (good for touch/big screens) */}
              <div className={`absolute bottom-full mb-1 ${popPos} z-40 w-max max-w-[18rem] rounded-md bg-ink-900 border border-ink-600 shadow-xl px-3 py-2 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'}`}>
                <div className="mono-label mb-1 text-ink-400">{fmtClock(atSeconds)} in</div>
                <ul className="flex flex-col gap-1">
                  {items.map((m) => {
                    const MIcon = challengeIcon(m.type);
                    const mChallenge = m.category === 'challenge';
                    return (
                      <li key={m.id} className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: mChallenge ? CORAL : 'var(--accent)' }}>
                          <MIcon size={9} className={mChallenge ? 'text-white' : 'text-[color:var(--accent-ink,#0a0b0d)]'} />
                        </span>
                        <span className="text-[11px] font-mono text-ink-100 whitespace-nowrap">
                          {m.label}{m.teamName ? ` · ${m.teamName}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-ink-400 text-center">
        {clusters.length === 0 ? 'No challenges yet — they appear here as the Wheel strikes.' : 'Hover or tap a gate to see what struck.'}
      </p>
    </div>
  );
};

// ── quest timeline ───────────────────────────────────────────────────────────

const QuestTimeline = ({ teams, events, durationSeconds, elapsedPct }: { teams: DashboardTeam[]; events: DashboardEvent[]; durationSeconds: number; elapsedPct: number }) => {
  const ranked = [...teams].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="card p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-[color:var(--accent)]" />
        <h2 className="font-bold text-lg text-foreground">Quest Timeline</h2>
        <span className="mono-label ml-auto">{teams.length} teams</span>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-ink-300 py-8 text-center">No teams on the board yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {ranked.map((team) => {
            const markers = events.filter((e) => e.category === 'challenge' && e.teamId === team.id);
            return (
              <div key={team.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  {team.rank != null && (
                    <span className="text-xs font-mono font-bold text-ink-400 w-6">#{team.rank}</span>
                  )}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team.color }} />
                  <span className="text-sm font-semibold text-foreground truncate">{team.name}</span>
                  <span className="flex items-center gap-0.5 ml-auto">
                    {Array.from({ length: team.shields }).map((_, i) => (
                      <Shield key={i} size={13} className="text-[color:var(--accent)]" fill="currentColor" />
                    ))}
                  </span>
                </div>
                <div className="relative h-1 rounded-full mt-3 mb-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {/* fill by elapsed event time */}
                  <div className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-1000 ease-linear"
                    style={{ width: `${elapsedPct}%`, background: `linear-gradient(90deg, ${team.color}26, ${team.color})` }}>
                    {/* glowing head dot */}
                    <span className="absolute right-0 top-1/2 w-3 h-3 rounded-full translate-x-1/2 -translate-y-1/2"
                      style={{ background: team.color, boxShadow: `0 0 0 3px rgba(255,255,255,0.06), 0 0 14px 1px ${team.color}` }} />
                  </div>
                  {/* challenge gates */}
                  {markers.map((m) => {
                    const left = durationSeconds > 0 ? Math.min(100, (m.atSeconds / durationSeconds) * 100) : 0;
                    return (
                      <div key={m.id} className="absolute -top-2 -bottom-2 -translate-x-1/2 w-4 flex items-center justify-center z-10 group"
                        style={{ left: `${left}%` }}>
                        <span className="h-full w-0.5 rounded"
                          style={{ background: 'repeating-linear-gradient(180deg, rgba(242,92,92,0.7) 0 4px, transparent 4px 8px)' }} />
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink-900 border border-ink-600 px-2 py-1 text-[10px] font-mono uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ color: CORAL }}>
                          {m.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── prediction market (reserved for Mathis) ──────────────────────────────────

const PredictionMarket = () => (
  <div className="card p-5 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-4">
      <TrendingUp size={18} className="text-cyan-400" />
      <h2 className="font-bold text-lg text-foreground">Prediction Market</h2>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-ink-600 rounded-sm py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center">
        <TrendingUp size={22} className="text-ink-400" />
      </div>
      <p className="text-sm font-semibold text-ink-200">Coming soon</p>
      <p className="text-xs text-ink-400 max-w-[220px]">Place your bets on who ships, who survives the Wheel, and who takes the crown.</p>
    </div>
  </div>
);

// ── active event cards ───────────────────────────────────────────────────────

const ActiveEventCards = ({ challenges, sideQuests, now }: { challenges: DashboardEvent[]; sideQuests: DashboardEvent[]; now: number }) => {
  if (challenges.length === 0 && sideQuests.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {challenges.map((c) => <EventCard key={c.id} ev={c} now={now} kind="challenge" />)}
      {sideQuests.map((q) => <EventCard key={q.id} ev={q} now={now} kind="side_quest" />)}
    </div>
  );
};

const StatusPill = ({ resolved }: { resolved: boolean }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider font-bold ${resolved ? 'bg-emerald-600/20 text-emerald-400' : 'bg-[color:var(--accent)]/20 text-[color:var(--accent)]'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${resolved ? 'bg-emerald-400' : 'bg-[color:var(--accent)] animate-pulse'}`} />
    {resolved ? 'Resolved' : 'Ongoing'}
  </span>
);

const EventCard = ({ ev, now, kind }: { ev: DashboardEvent; now: number; kind: 'challenge' | 'side_quest' }) => {
  const Icon = challengeIcon(ev.type);
  const resolved = !ev.active;
  let countdown: number | null = null;
  if (ev.durationSeconds && !resolved) {
    const endsAt = new Date(ev.createdAt).getTime() + ev.durationSeconds * 1000;
    countdown = Math.max(0, Math.floor((endsAt - now) / 1000));
  }
  const isChallenge = kind === 'challenge';
  const accent = resolved ? '#10b981' : isChallenge ? '#ef4444' : 'var(--accent)';
  const iconInk = resolved || !isChallenge ? 'text-[color:var(--accent-ink,#0a0b0d)]' : 'text-white';
  const borderClass = resolved
    ? 'border-emerald-600/50'
    : isChallenge ? 'border-red-600/60' : 'border-[color:var(--accent)]/60';
  return (
    <div className={`card p-5 relative overflow-hidden border ${borderClass} ${resolved ? 'opacity-90' : ''}`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle at 100% 0%, ${accent}, transparent 60%)` }} />
      <div className="relative flex items-start gap-4">
        <div className="w-11 h-11 rounded-sm flex items-center justify-center shrink-0" style={{ background: accent }}>
          <Icon size={20} className={iconInk} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="mono-label">{isChallenge ? 'Wheel of Destiny' : 'Side Quest'}</p>
            <StatusPill resolved={resolved} />
          </div>
          <p className="font-bold text-foreground leading-snug">{ev.label}</p>
          {ev.teamName && <p className="text-sm text-ink-300 mt-0.5">Target: <span className="text-foreground font-semibold">{ev.teamName}</span></p>}
          {ev.reward && <p className="text-sm text-ink-300 mt-0.5">Reward: <span className="text-[color:var(--accent)] font-semibold">{ev.reward}</span></p>}
          {resolved && ev.resultText && <p className="text-sm text-emerald-400 mt-0.5">{ev.resultText}</p>}
        </div>
        {countdown != null && (
          <div className="text-right shrink-0">
            <p className="mono-label mb-0.5">Ends in</p>
            <p className="font-mono font-bold text-2xl tabular-nums text-foreground">{fmtClock(countdown)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── live feed ────────────────────────────────────────────────────────────────

const FEED_ICON: Record<string, typeof Activity> = {
  challenge: Zap,
  side_quest: Target,
  deploy: Rocket,
  market: TrendingUp,
  announcement: Megaphone,
  info: Activity,
};

const LiveFeed = ({ feed }: { feed: FeedEvent[] }) => (
  <div className="card p-5">
    <div className="flex items-center gap-2 mb-4">
      <Clock size={18} className="text-[color:var(--accent)]" />
      <h2 className="font-bold text-lg text-foreground">Live Feed</h2>
    </div>
    {feed.length === 0 ? (
      <p className="text-sm text-ink-300 py-6 text-center">Nothing has happened yet. Stay tuned.</p>
    ) : (
      <div className="flex flex-col divide-y divide-ink-700 max-h-[340px] overflow-y-auto">
        {feed.map((f) => {
          const Icon = FEED_ICON[f.kind] ?? Activity;
          return (
            <div key={f.id} className="flex items-center gap-3 py-2.5">
              <Icon size={15} className={`shrink-0 ${FEED_ACCENT[f.kind] ?? 'text-ink-300'}`} />
              <p className="text-sm text-ink-100 flex-1">{f.message}</p>
              <span className="text-xs font-mono text-ink-400 shrink-0 tabular-nums">{fmtTimeOfDay(f.createdAt)}</span>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default DashboardPage;
