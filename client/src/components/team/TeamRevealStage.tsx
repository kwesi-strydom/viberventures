import React from 'react';

export type RevealBuilder = {
  id: string | number;
  name: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
};

export type RevealTeam = { name: string; builders: RevealBuilder[] };

export default function TeamRevealStage({
  phase,
  builders,
  teams,
  spinningIds,
  revealedTeams,
}: {
  phase: 'idle' | 'spinning' | 'revealed';
  builders: RevealBuilder[];
  teams: RevealTeam[];
  spinningIds: (string | number)[];
  revealedTeams: number[];
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1400px] mx-auto relative z-10">
      {phase === 'idle' && (
        <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
          {builders.map(builder => (
            <div key={builder.id} className="flex flex-col items-center gap-3 px-6 py-4 rounded-xl bg-card border border-border text-foreground">
              {builder.avatarUrl ? (
                <img src={builder.avatarUrl} className="h-14 w-14 rounded-md object-cover" alt="" />
              ) : (
                <div className="h-14 w-14 rounded-md bg-background border border-border flex items-center justify-center text-xl font-bold font-mono">
                  {builder.name[0]}
                </div>
              )}
              <span className="font-bold text-sm tracking-wide">{builder.name}</span>
            </div>
          ))}
        </div>
      )}
      {phase === 'spinning' && (
        <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
          {builders.map(builder => {
            const isSpinning = spinningIds.includes(builder.id);
            return (
              <div key={builder.id}
                className="flex flex-col items-center gap-3 px-6 py-4 rounded-xl border transition-all duration-100"
                style={{
                  borderColor: isSpinning ? 'var(--accent)' : 'var(--ink-600)',
                  backgroundColor: isSpinning ? 'var(--accent)' : 'var(--ink-700)',
                  color: isSpinning ? 'var(--accent-ink)' : 'var(--ink-100)',
                  transform: isSpinning ? `translateY(${Math.random() > 0.5 ? -6 : 6}px) scale(1.08)` : 'none',
                  boxShadow: isSpinning ? '0 0 40px var(--accent-soft)' : 'none',
                }}>
                {builder.avatarUrl ? (
                  <img src={builder.avatarUrl} className="h-14 w-14 rounded-md object-cover" alt="" />
                ) : (
                  <div className="h-14 w-14 rounded-md flex items-center justify-center text-xl font-bold font-mono"
                    style={{ backgroundColor: isSpinning ? 'var(--accent-ink)' : 'var(--ink-900)', color: isSpinning ? 'var(--accent)' : 'var(--ink-100)' }}>
                    {builder.name[0]}
                  </div>
                )}
                <span className="font-bold text-sm tracking-wide">{builder.name}</span>
              </div>
            );
          })}
        </div>
      )}
      {phase === 'revealed' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
          {teams.map((team, i) => {
            const isVisible = revealedTeams.includes(i);
            return (
              <div key={team.name}
                className="card transition-all duration-500 flex flex-col"
                style={{
                  borderColor: isVisible ? 'var(--accent)' : 'var(--ink-600)',
                  backgroundColor: isVisible ? 'var(--ink-850)' : 'var(--ink-700)',
                  boxShadow: isVisible ? '0 0 40px var(--accent-soft)' : 'none',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.9)',
                }}>
                <div className="mono-label text-center mb-6" style={{ color: isVisible ? 'var(--accent)' : 'var(--ink-300)' }}>
                  {team.name}
                </div>
                <div className="flex flex-col gap-5 flex-1 justify-center">
                  {team.builders.map(builder => (
                    <div key={builder.id} className="flex items-center gap-4 bg-background p-3 rounded-lg border border-border">
                      {builder.avatarUrl ? (
                        <img src={builder.avatarUrl} className="h-12 w-12 rounded-md object-cover" alt="" />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-card border border-border flex items-center justify-center text-xl font-bold font-mono">
                          {builder.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground font-bold truncate">{builder.name}</div>
                        {builder.subtitle && <div className="text-muted-foreground text-xs font-mono truncate">{builder.subtitle}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}