import { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import type { Project } from '@shared/astana';
import { astanaRequest, useRefreshAstana } from '@/hooks/useAstana';
import { Notice } from './AstanaLayout';
import './project-card.css';

export default function ProjectCard({
  project,
  allowVote = false,
  ownTeam = false,
  rank,
}: {
  project: Project;
  allowVote?: boolean;
  ownTeam?: boolean;
  rank?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const refresh = useRefreshAstana();
  const canVote = allowVote && !ownTeam;

  async function vote(value: number) {
    if (!canVote || busy) return;
    setBusy(true);
    setError('');
    try {
      await astanaRequest('/visitor', 'POST');
      await astanaRequest(`/projects/${project.id}/rating`, 'PUT', { rating: value });
      setRating(value);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setHoverRating(null);
    }
  }

  // Match the VIBER game card's full/half/empty stars. Astana votes remain
  // whole numbers, even though an average can display a partial star.
  const displayRating = Math.max(0, Math.min(5, hoverRating ?? project.averageRating ?? 0));

  return (
    <article
      className="card viber-project-card p-0 flex flex-col h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoverRating(null); }}
    >
      <div className="relative overflow-hidden rounded-t-[9px]">
        <img
          src={project.thumbnailUrl}
          alt={`${project.title} preview`}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={event => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = '/website/assets/viber-logo.png';
          }}
        />
        <div className="absolute inset-0 bg-ink-900/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xs transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} group-focus-within:translate-y-0 group-focus-within:opacity-100`}>
            <div className="flex flex-col gap-3">
              <a className="btn btn-primary w-full" href={project.appUrl} target="_blank" rel="noopener noreferrer">
                Play Now
              </a>
              {project.socialUrl && (
                <a className="btn btn-solid w-full" href={project.socialUrl} target="_blank" rel="noopener noreferrer">
                  See the post
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col">
        <div className="mb-3">
          {rank && <p className="astana-rank">{['', '1st place', '2nd place', '3rd place'][rank]}</p>}
          <h3 className="h3 mb-1 line-clamp-1">{project.title}</h3>
          <p className="text-xs font-mono text-ink-300 uppercase tracking-wider">TEAM {project.teamName}</p>
        </div>

        <p className="text-sm text-ink-200 leading-relaxed line-clamp-2 mb-6 flex-grow">
          {project.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-ink-600 mt-auto">
          <div className={`flex items-center gap-1 ${busy ? 'opacity-50 pointer-events-none' : ''}`}
            role="group" aria-label={`Rating for ${project.title}`}
            onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map(value => {
              const difference = displayRating - value + 1;
              const Icon = difference >= 1 ? Star : difference > 0 ? StarHalf : Star;
              const filled = difference > 0;
              return (
                <button key={value} type="button" disabled={!canVote || busy}
                  aria-label={`Rate ${project.title} ${value} star${value === 1 ? '' : 's'}`}
                  aria-pressed={canVote && rating === value}
                  onClick={() => vote(value)}
                  onMouseEnter={() => canVote && setHoverRating(value)}
                  onFocus={() => canVote && setHoverRating(value)}
                  onBlur={() => setHoverRating(null)}
                  className={`viber-project-star touch-manipulation ${
                    filled ? 'text-primary' : 'text-ink-500'
                  } ${canVote ? 'cursor-pointer hover:text-primary' : 'cursor-default'}`}>
                  <Icon className="h-6 w-6" fill={filled ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div className="flex flex-col items-end">
            <span className="num text-xl font-bold leading-none text-primary">
              {project.ratingCount ? project.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mt-1">Rating</span>
            <span className="sr-only">{project.ratingCount} audience ratings</span>
          </div>
        </div>
        {canVote && rating !== null && (
          <p role="status" className="text-xs text-muted-foreground mt-3">
            You rated {rating}/5. Choose another star to update.
          </p>
        )}
        {allowVote && ownTeam && (
          <p className="text-xs text-muted-foreground mt-3">This is your team’s project.</p>
        )}
        <Notice error message={error} />
      </div>
    </article>
  );
}