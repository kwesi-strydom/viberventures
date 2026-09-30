import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shuffle, Users, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@shared/schema';
import { CURRENT_EDITION } from '@shared/schema';
import TeamRevealStage from '@/components/team/TeamRevealStage';

type SafeUser = Omit<User, 'password'>;

type Phase = 'idle' | 'spinning' | 'revealed';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
};

const TeamRandomizerPage = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const teamSize = 2;
  const [teams, setTeams] = useState<SafeUser[][]>([]);
  const [revealedTeams, setRevealedTeams] = useState<number[]>([]);
  const [spinningCards, setSpinningCards] = useState<number[]>([]);
  const spinInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { toast } = useToast();

  const clearPendingTimeouts = () => {
    pendingTimeouts.current.forEach(clearTimeout);
    pendingTimeouts.current = [];
  };

  const { data: users = [] } = useQuery<SafeUser[]>({ queryKey: ['/api/admin/users'] });
  // Only this Viber session's onboarded builders — keeps past editions out of the draw.
  // Legacy/null editions are treated as past sessions and excluded.
  const competitors = users.filter(
    u => u.userType === 'competitor' && u.edition === CURRENT_EDITION && u.onboarded,
  );

  const handleRandomize = () => {
    if (competitors.length === 0) return;
    setPhase('spinning');
    setRevealedTeams([]);
    setTeams([]);

    // Shuffle cards visually
    const ids = competitors.map(c => c.id);
    let tick = 0;
    spinInterval.current = setInterval(() => {
      setSpinningCards(shuffle(ids).slice(0, Math.ceil(ids.length * 0.6)));
      tick++;
      if (tick > 12) {
        clearInterval(spinInterval.current!);
        // Compute final teams
        const shuffled = shuffle(competitors);
        const grouped = chunk(shuffled, teamSize);
        setTeams(grouped);
        setSpinningCards([]);
        setPhase('revealed');
        // Reveal teams one by one, then auto-save
        grouped.forEach((_, i) => {
          pendingTimeouts.current.push(setTimeout(() => setRevealedTeams(prev => [...prev, i]), i * 600 + 200));
        });
        const lastReveal = grouped.length * 600 + 200;
        pendingTimeouts.current.push(setTimeout(() => {
          const assignments = grouped.flatMap((team, i) =>
            team.map(member => ({ userId: member.id, teamName: `Team ${i + 1}` }))
          );
          apiRequest('/api/admin/assign-teams', {
            method: 'POST',
            body: JSON.stringify({ assignments }),
          }).catch(() => {
            toast({ title: 'Auto-save failed', description: 'Team assignments could not be saved.', variant: 'destructive' });
          });
        }, lastReveal));
      }
    }, 120);
  };

  const handleReset = () => {
    if (!window.confirm('Reset the randomizer and clear ALL saved team assignments? This cannot be undone.')) return;
    setPhase('idle');
    setTeams([]);
    setRevealedTeams([]);
    setSpinningCards([]);
    if (spinInterval.current) clearInterval(spinInterval.current);
    clearPendingTimeouts();
    apiRequest('/api/admin/clear-teams', { method: 'POST' })
      .then(() => toast({ title: 'Teams reset', description: 'All team assignments have been cleared.' }))
      .catch(() => toast({ title: 'Reset failed', description: 'Could not clear team assignments.', variant: 'destructive' }));
  };

  useEffect(() => () => { if (spinInterval.current) clearInterval(spinInterval.current); clearPendingTimeouts(); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 's' || e.key === 'S') handleRandomize();
      if (e.key === 'r' || e.key === 'R') handleReset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, competitors.length]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col px-8 py-10 overflow-x-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(255,255,255,0.03) 0%, transparent 60%)' }} />

      <div className="flex items-center justify-between mb-16 relative z-10">
        <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mono-label">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="display text-foreground text-center tracking-tighter">
          Team Randomizer
        </h1>
        <div className="w-20" />
      </div>

      <div className="flex flex-col items-center gap-6 mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card mono-label">
          <span className="text-primary font-bold">Viber {CURRENT_EDITION}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground">{competitors.length} builders</span>
        </div>

        {phase === 'spinning' && (
          <div className="flex items-center gap-3 text-primary font-bold animate-pulse display text-2xl">
            <Shuffle className="h-8 w-8 animate-spin" /> Randomizing
          </div>
        )}

        <div className="flex gap-8 mono-label">
          <span className="flex items-center gap-2"><kbd className="px-2 py-1 rounded bg-card border border-border text-foreground font-mono">S</kbd> Randomize</span>
          <span className="flex items-center gap-2"><kbd className="px-2 py-1 rounded bg-card border border-border text-foreground font-mono">R</kbd> Reset</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1400px] mx-auto relative z-10">
        {phase === 'idle' && competitors.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            <Users className="h-16 w-16 mx-auto mb-6 opacity-20" />
            <p className="mono-label">No onboarded builders for Viber {CURRENT_EDITION} yet. Once competitors finish onboarding for this session, they'll appear here.</p>
          </div>
        )}
        {(phase !== 'idle' || competitors.length > 0) && <TeamRevealStage
          phase={phase}
          builders={competitors.map(c => ({
            id: c.id, name: c.name,
            avatarUrl: c.discordId && c.discordAvatar ? `https://cdn.discordapp.com/avatars/${c.discordId}/${c.discordAvatar}.png?size=128` : null,
            subtitle: c.discordUsername ? `@${c.discordUsername}` : null,
          }))}
          teams={teams.map((team, i) => ({
            name: `Team ${i + 1}`,
            builders: team.map(c => ({
              id: c.id, name: c.name,
              avatarUrl: c.discordId && c.discordAvatar ? `https://cdn.discordapp.com/avatars/${c.discordId}/${c.discordAvatar}.png?size=128` : null,
              subtitle: c.discordUsername ? `@${c.discordUsername}` : null,
            })),
          }))}
          spinningIds={spinningCards}
          revealedTeams={revealedTeams}
        />}
      </div>
    </div>
  );
};

export default TeamRandomizerPage;
