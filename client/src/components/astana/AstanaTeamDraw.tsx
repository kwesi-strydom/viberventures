import { useEffect, useState } from 'react';
import { Shuffle, Users } from 'lucide-react';
import type { AdminState } from '@shared/astana';
import { astanaRequest } from '@/hooks/useAstana';
import TeamRevealStage, { type RevealBuilder, type RevealTeam } from '@/components/team/TeamRevealStage';

const shuffled = <T,>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export default function AstanaTeamDraw({
  state,
  busy,
  setBusy,
  onAssigned,
  onError,
}: {
  state: AdminState;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onAssigned: () => Promise<unknown>;
  onError: (message: string) => void;
}) {
  const [phase, setPhase] = useState<'spinning' | 'revealed' | null>(null);
  const [builders, setBuilders] = useState<RevealBuilder[]>([]);
  const [teams, setTeams] = useState<RevealTeam[]>([]);
  const [spinningIds, setSpinningIds] = useState<string[]>([]);
  const [revealedTeams, setRevealedTeams] = useState<number[]>([]);
  const [drawRevision, setDrawRevision] = useState<number | null>(null);

  useEffect(() => {
    if (phase !== 'spinning') return;
    const timer = setInterval(() => {
      setSpinningIds(shuffled(builders.map(builder => String(builder.id))).slice(0, Math.ceil(builders.length * 0.6)));
    }, 120);
    return () => clearInterval(timer);
  }, [phase, builders]);

  useEffect(() => {
    if (phase !== 'revealed') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealedTeams(teams.map((_, index) => index));
      return;
    }
    const timers = teams.map((_, index) =>
      setTimeout(() => setRevealedTeams(previous => [...previous, index]), index * 600 + 200)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, teams]);

  useEffect(() => {
    if (phase === 'revealed' && drawRevision !== null && state.rosterRevision > drawRevision) setPhase(null);
  }, [phase, drawRevision, state.rosterRevision]);

  async function draw() {
    if (busy || state.guests.length < 2 || state.projects.length > 0) return;
    if (state.teams.length && !window.confirm('Redraw all Astana teams? Existing assignments will change.')) return;
    const roster = state.guests.map(guest => ({ id: guest.id, name: guest.name }));
    setBuilders(roster);
    setTeams([]);
    setRevealedTeams([]);
    setSpinningIds([]);
    setPhase('spinning');
    onError('');
    setBusy(true);
    const started = Date.now();
    try {
      // The server owns the draw, including the odd-roster trio and revision check.
      // Never reveal a client-side guess before the assignment has been saved.
      const assigned = await astanaRequest<AdminState>('/admin/assign', 'POST', {
        rosterRevision: state.rosterRevision,
      });
      await onAssigned();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 1560 - (Date.now() - started))));
      }
      setTeams(assigned.teams.map(team => ({
        name: team.name,
        builders: team.members.map(member => ({ id: member.id, name: member.name })),
      })));
      setDrawRevision(assigned.rosterRevision);
      setPhase('revealed');
    } catch (error) {
      setPhase(null);
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shownBuilders = phase ? builders : state.guests.map(guest => ({ id: guest.id, name: guest.name }));
  const shownTeams = phase ? teams : state.teams.map(team => ({
    name: team.name,
    builders: team.members.map(member => ({ id: member.id, name: member.name })),
  }));
  const shownReveals = phase ? revealedTeams : shownTeams.map((_, index) => index);
  const shownPhase = phase ?? (shownTeams.length ? 'revealed' : 'idle');

  return (
    <section className="min-h-[65vh] flex flex-col px-4 py-8 relative text-foreground">
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(255,255,255,0.03) 0%, transparent 60%)' }} />
      <div className="flex flex-col items-center gap-6 mb-12 relative z-10">
        <h2 className="display text-foreground text-center tracking-tighter">Team Randomizer</h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card mono-label">
          <span className="text-primary font-bold">Viber Astana</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground">{shownBuilders.length} builders</span>
        </div>
        {phase === 'spinning' ? (
          <div role="status" className="flex items-center gap-3 text-primary font-bold animate-pulse display text-2xl">
            <Shuffle className="h-8 w-8 animate-spin" /> Randomizing
          </div>
        ) : phase === 'revealed' && revealedTeams.length < teams.length ? (
          <p role="status" className="mono-label text-primary">Revealing teams</p>
        ) : null}
        <button className="btn btn-primary"
          disabled={busy || phase === 'spinning' || (phase === 'revealed' && revealedTeams.length < teams.length) ||
            state.guests.length < 2 || state.projects.length > 0}
          onClick={draw}>Randomize teams</button>
        {state.projects.length > 0 && (
          <p className="text-sm text-muted-foreground">Projects have launched. Move or swap builders below instead of redrawing.</p>
        )}
      </div>
      {shownPhase === 'idle' && shownBuilders.length === 0 ? (
        <div className="text-center text-muted-foreground py-20 relative z-10">
          <Users className="h-16 w-16 mx-auto mb-6 opacity-20" />
          <p className="mono-label">No checked-in builders yet. Open check-in to fill the draw.</p>
        </div>
      ) : (
        <TeamRevealStage phase={shownPhase} builders={shownBuilders} teams={shownTeams}
          spinningIds={spinningIds} revealedTeams={shownReveals} />
      )}
    </section>
  );
}