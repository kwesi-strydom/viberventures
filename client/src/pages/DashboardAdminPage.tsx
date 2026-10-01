import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Link } from 'react-router-dom';
import {
  Play, RotateCcw, Square, Shield,
  Zap, Target, Megaphone, ExternalLink, Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import type { DashboardSnapshot, DashboardTeam, DashboardEvent } from '@shared/schema';

const CHALLENGE_TYPES = [
  { value: 'founders_dispute', label: "Founders' Dispute" },
  { value: 'server_crash', label: 'Server Crash' },
  { value: 'lawsuit', label: 'Legal Action' },
  { value: 'copyright_strike', label: 'Copyright Strike' },
  { value: 'safe_round', label: 'Safe Round' },
  { value: 'custom', label: 'Custom' },
];

const MAX_TIMER_MINUTES = 10080;

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`
    : `${pad(minutes)}:${pad(remainingSeconds)}`;
}

const DashboardAdminPage = () => {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery<DashboardSnapshot>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 15000,
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });

  const eventMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/event', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });
  const timerMut = useMutation({
    mutationFn: (body: { action: 'start' | 'stop' | 'reset' | 'set-duration'; durationSeconds?: number }) =>
      apiRequest('/api/admin/dashboard/timer', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
    onError: (error: Error) => toast({ title: error.message || 'Timer action failed', variant: 'destructive' }),
  });
  const updateTeamMut = useMutation({
    mutationFn: (vars: { id: number; data: Partial<DashboardTeam> }) => apiRequest(`/api/admin/dashboard/teams/${vars.id}`, { method: 'PATCH', body: JSON.stringify(vars.data) }),
    onSuccess: invalidate,
  });
  const challengeMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/challenge', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: 'Challenge triggered' }); },
    onError: () => toast({ title: 'Need a team', variant: 'destructive' }),
  });
  const sideQuestMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/side-quest', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: 'Side quest launched' }); },
    onError: () => toast({ title: 'Need a title', variant: 'destructive' }),
  });
  const resolveMut = useMutation({
    mutationFn: (vars: { id: string; resultText?: string }) => apiRequest(`/api/admin/dashboard/events/${vars.id}/resolve`, { method: 'POST', body: JSON.stringify({ resultText: vars.resultText }) }),
    onSuccess: invalidate,
  });
  const feedMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/feed', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: 'Posted to feed' }); },
  });
  const resetChallengesMut = useMutation({
    mutationFn: () => apiRequest('/api/admin/dashboard/clear-outcomes', { method: 'POST' }),
    onSuccess: () => { invalidate(); toast({ title: 'All challenges reset' }); },
    onError: () => toast({ title: 'Reset failed', variant: 'destructive' }),
  });

  // Competitions list for the plug-and-play event selector.
  const { data: allEvents } = useQuery<Array<{ id: number; name: string; edition: number; status: string; competitorCount: number }>>({
    queryKey: ['/api/events'],
  });

  // form state
  const [durationMin, setDurationMin] = useState('');
  const [challengeTeam, setChallengeTeam] = useState<number | ''>('');
  const [challengeType, setChallengeType] = useState('server_crash');
  const [challengeDur, setChallengeDur] = useState<number | ''>(120);
  const [sqLabel, setSqLabel] = useState('');
  const [sqReward, setSqReward] = useState('');
  const [sqDur, setSqDur] = useState<number | ''>(180);
  const [announce, setAnnounce] = useState('');
  const [announceNotify, setAnnounceNotify] = useState(true);

  if (authLoading) return <div className="p-8 text-center text-ink-300">Checking access…</div>;
  if (!user || !user.isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="h2 text-xl text-primary mb-2">Admin only</h1>
        <p className="text-ink-300">You need operator access to control the live dashboard.</p>
      </div>
    );
  }

  const event = data?.event;
  const teams = data?.teams ?? [];
  const activeEvents = (data?.events ?? []).filter((e) => e.active);
  const timerElapsed = event
    ? Math.max(0, Math.min(
      event.accumulatedSeconds + (event.status === 'running' && event.startedAt
        ? Math.floor((now - new Date(event.startedAt).getTime()) / 1000)
        : 0),
      event.durationSeconds,
    ))
    : 0;
  const timerRemaining = event ? Math.max(0, event.durationSeconds - timerElapsed) : 0;
  const timerExpired = !!event && event.status !== 'idle' && timerRemaining === 0;

  const setTimerDuration = (minutes: number) => {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TIMER_MINUTES) {
      toast({
        title: `Enter a whole number from 1 to ${MAX_TIMER_MINUTES} minutes`,
        variant: 'destructive',
      });
      return;
    }
    timerMut.mutate({ action: 'set-duration', durationSeconds: minutes * 60 });
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="kicker mb-1">Operator Console</p>
          <h1 className="text-2xl font-extrabold text-foreground">Live Dashboard Control</h1>
        </div>
        <a href="/dashboard" target="_blank" rel="noreferrer" className="btn btn-ghost inline-flex items-center gap-2">
          <ExternalLink size={15} /> Open public dashboard
        </a>
      </div>

      {/* Competition link — plug-and-play */}
      <section className="card p-5">
        <h2 className="font-bold text-lg text-foreground mb-1">Connected Competition</h2>
        <p className="text-sm text-ink-300 mb-3">
          The arena mirrors the competitor roster of the selected competition. Pick a different one to run
          the dashboard for another (or parallel) event — teams sync automatically.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={event?.linkedEventId ?? ''}
            onChange={(e) => eventMut.mutate({ action: 'set-event', eventId: e.target.value ? parseInt(e.target.value) : null })}
            className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground min-w-[240px]">
            <option value="">Default (current edition)</option>
            {(allEvents ?? []).map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name} · {ev.competitorCount} competitors</option>
            ))}
          </select>
          {data?.linkedEvent && (
            <span className="mono-label">Now powering: {data.linkedEvent.name}</span>
          )}
        </div>
      </section>

      {/* Independent manual timer */}
      <section className="card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-bold text-lg text-foreground mb-1">Manual Timer</h2>
            <p className="text-sm text-ink-300">Set any whole-minute duration, then start, stop, or reset the clock independently of the arena.</p>
          </div>
          <span className="mono-label">Status: {event?.status ?? 'loading'}</span>
        </div>
        <div className="my-5 flex items-center gap-5 flex-wrap">
          <span className="font-mono text-4xl md:text-5xl font-bold tabular-nums text-foreground" role="timer" aria-label={`${timerRemaining} seconds remaining`}>
            {formatTimer(timerRemaining)}
          </span>
          {event && <span className="text-sm text-ink-400">of {formatTimer(event.durationSeconds)}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-primary inline-flex items-center gap-2"
            disabled={!event || event.status === 'running' || timerExpired || timerMut.isPending}
            onClick={() => timerMut.mutate({ action: 'start' })}>
            <Play size={15} /> {event?.status === 'paused' ? 'Resume' : 'Start'}
          </button>
          <button className="btn inline-flex items-center gap-2"
            disabled={!event || event.status !== 'running' || timerMut.isPending}
            onClick={() => timerMut.mutate({ action: 'stop' })}>
            <Square size={15} /> Stop
          </button>
          <button className="btn btn-ghost inline-flex items-center gap-2"
            disabled={!event || timerMut.isPending} title="Return the timer to zero. This changes only the timer."
            onClick={() => timerMut.mutate({ action: 'reset' })}>
            <RotateCcw size={15} /> Reset
          </button>
        </div>
        {timerExpired && <p className="text-xs text-ink-400 mt-2" role="status">The timer is at zero. Press Reset before starting another countdown.</p>}
        <div className="mt-5 border-t border-ink-600 pt-4">
          <p className="text-sm text-ink-300 mb-2">Set duration</p>
          <div className="flex items-center gap-2 flex-wrap">
            {[60, 10, 5].map((minutes) => (
              <button key={minutes} className={`btn ${event?.durationSeconds === minutes * 60 ? 'btn-primary' : 'btn-ghost'}`}
                disabled={timerMut.isPending} onClick={() => setTimerDuration(minutes)}>
                {minutes} min
              </button>
            ))}
            <label className="sr-only" htmlFor="manual-timer-minutes">Custom duration in minutes</label>
            <input id="manual-timer-minutes" type="number" min={1} max={MAX_TIMER_MINUTES} step={1}
              value={durationMin || String(Math.round((event?.durationSeconds ?? 3600) / 60))}
              onChange={(e) => setDurationMin(e.target.value)}
              className="w-28 bg-ink-800 border border-ink-600 rounded-sm px-2 py-2 text-foreground" />
            <button className="btn btn-ghost" disabled={timerMut.isPending}
              onClick={() => setTimerDuration(Number(durationMin || Math.round((event?.durationSeconds ?? 3600) / 60)))}>
              Set minutes
            </button>
          </div>
          <p className="text-xs text-ink-400 mt-2">Use any whole number from 1 to {MAX_TIMER_MINUTES} minutes. Stopping preserves the remaining time; Reset only resets this clock.</p>
        </div>
      </section>

      {/* Teams */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg text-foreground">Teams</h2>
          <span className="mono-label">{teams.length} live</span>
        </div>
        <p className="text-sm text-ink-300 mb-3">
          Teams mirror the platform automatically. They're created, renamed and removed from <span className="text-foreground">/admin</span>.
          Colour, rank and shields here are display-only and stay with each team across roster changes.
        </p>
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-ink-800 rounded-sm px-3 py-2 flex-wrap">
              <input type="color" value={t.color} onChange={(e) => updateTeamMut.mutate({ id: t.id, data: { color: e.target.value } })}
                className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer p-0" title="Team colour" />
              <span className="font-semibold text-foreground flex-1 min-w-[120px]">{t.name}</span>
              <div className="flex items-center gap-1">
                <span className="mono-label">Rank</span>
                <input type="number" min={1} value={t.rank ?? ''} placeholder="-" onChange={(e) => updateTeamMut.mutate({ id: t.id, data: { rank: e.target.value ? parseInt(e.target.value) : null } })}
                  className="w-14 bg-ink-900 border border-ink-600 rounded-sm px-2 py-1 text-foreground" />
              </div>
              <div className="flex items-center gap-1">
                <Shield size={14} className="text-[color:var(--accent)]" />
                <button className="btn btn-ghost px-2 py-0.5" onClick={() => updateTeamMut.mutate({ id: t.id, data: { shields: Math.max(0, t.shields - 1) } })}>−</button>
                <span className="w-5 text-center text-foreground">{t.shields}</span>
                <button className="btn btn-ghost px-2 py-0.5" onClick={() => updateTeamMut.mutate({ id: t.id, data: { shields: t.shields + 1 } })}>+</button>
              </div>
            </div>
          ))}
          {teams.length === 0 && <p className="text-sm text-ink-300">No platform teams yet. Assign teams in /admin to populate the board.</p>}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Challenge */}
        <section className="card p-5">
          <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2"><Zap size={18} className="text-[color:var(--accent)]" /> Trigger Challenge</h2>
          <div className="flex flex-col gap-2">
            <select value={challengeTeam} onChange={(e) => setChallengeTeam(e.target.value ? parseInt(e.target.value) : '')}
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground">
              <option value="">Select team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={challengeType} onChange={(e) => setChallengeType(e.target.value)}
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground">
              {CHALLENGE_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-300">Countdown (sec, optional)</label>
              <input type="number" min={0} value={challengeDur} onChange={(e) => setChallengeDur(e.target.value ? parseInt(e.target.value) : '')}
                className="w-24 bg-ink-800 border border-ink-600 rounded-sm px-2 py-1 text-foreground" />
            </div>
            <button className="btn btn-primary inline-flex items-center justify-center gap-2" disabled={challengeTeam === ''}
              onClick={() => challengeMut.mutate({ teamId: challengeTeam, type: challengeType, durationSeconds: challengeDur === '' ? null : challengeDur })}>
              <Zap size={15} /> Trigger
            </button>
          </div>
        </section>

        {/* Side quest */}
        <section className="card p-5">
          <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2"><Target size={18} className="text-[color:var(--accent)]" /> Launch Side Quest</h2>
          <div className="flex flex-col gap-2">
            <input value={sqLabel} onChange={(e) => setSqLabel(e.target.value)} placeholder="Side quest title"
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground" />
            <input value={sqReward} onChange={(e) => setSqReward(e.target.value)} placeholder="Reward (e.g. a shield)"
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-300">Countdown (sec, optional)</label>
              <input type="number" min={0} value={sqDur} onChange={(e) => setSqDur(e.target.value ? parseInt(e.target.value) : '')}
                className="w-24 bg-ink-800 border border-ink-600 rounded-sm px-2 py-1 text-foreground" />
            </div>
            <button className="btn btn-primary inline-flex items-center justify-center gap-2" disabled={!sqLabel.trim()}
              onClick={() => { sideQuestMut.mutate({ label: sqLabel.trim(), reward: sqReward.trim() || null, durationSeconds: sqDur === '' ? null : sqDur }); setSqLabel(''); setSqReward(''); }}>
              <Target size={15} /> Launch
            </button>
          </div>
        </section>
      </div>

      {/* Active events */}
      {activeEvents.length > 0 && (
        <section className="card p-5">
          <h2 className="font-bold text-lg text-foreground mb-3">Active Cards</h2>
          <div className="flex flex-col gap-2">
            {activeEvents.map((ev: DashboardEvent) => (
              <div key={ev.id} className="flex items-center gap-3 bg-ink-800 rounded-sm px-3 py-2">
                <span className="text-xs font-mono uppercase text-ink-400 w-20">{ev.category === 'side_quest' ? 'Side Quest' : 'Challenge'}</span>
                <span className="text-sm text-foreground flex-1">{ev.label}{ev.teamName ? ` → ${ev.teamName}` : ''}</span>
                <button className="btn btn-ghost inline-flex items-center gap-1.5" onClick={() => resolveMut.mutate({ id: ev.id })}>
                  <Check size={14} /> Clear
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Announcement */}
      <section className="card p-5">
        <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2"><Megaphone size={18} className="text-[color:var(--accent)]" /> Announcement</h2>
        <textarea value={announce} onChange={(e) => setAnnounce(e.target.value)} rows={2} placeholder="Post a message to the live feed…"
          className="w-full bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground" />
        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input type="checkbox" checked={announceNotify} onChange={(e) => setAnnounceNotify(e.target.checked)} />
            Also notify logged-in users
          </label>
          <button className="btn btn-primary inline-flex items-center gap-2" disabled={!announce.trim()}
            onClick={() => { feedMut.mutate({ message: announce.trim(), kind: 'announcement', notify: announceNotify }); setAnnounce(''); }}>
            <Megaphone size={15} /> Post
          </button>
        </div>
      </section>

      {/* Board history controls are deliberately separate from the manual timer. */}
      <section className="card p-5">
        <h2 className="font-bold text-lg text-foreground mb-1 flex items-center gap-2"><RotateCcw size={18} className="text-[color:var(--accent)]" /> Board history</h2>
        <p className="text-sm text-ink-300 mb-3">
          Clear challenge and feed history only when needed. This action does not change the timer, duration, or linked roster.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-primary inline-flex items-center gap-2" disabled={resetChallengesMut.isPending}
            onClick={() => { if (confirm('Clear all challenges, side quests, and feed events? The timer, duration, and roster will not change.')) resetChallengesMut.mutate(); }}>
            <RotateCcw size={15} /> Clear timeline &amp; feed
          </button>
        </div>
      </section>

      <div className="flex justify-between items-center pt-2">
        <Link to="/admin" className="text-sm text-ink-300 hover:text-foreground">← Back to admin</Link>
      </div>

      {isLoading && <p className="text-center text-ink-400 text-sm">Loading…</p>}
    </div>
  );
};

export default DashboardAdminPage;
