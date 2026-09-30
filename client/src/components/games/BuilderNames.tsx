import { Link } from 'react-router-dom';
import type { Game } from '@/types';

export default function BuilderNames({ builders }: { builders: Game['builders'] }) {
  if (!builders?.length) return null;
  return (
    <div className="mt-1.5 text-xs text-muted-foreground">
      <span className="font-semibold uppercase tracking-wider">Builders: </span>
      {builders.map((builder, index) => (
        <span key={builder.id}>
          {index > 0 && ', '}
          {builder.profilePublic ? (
            <Link to={`/builders/${encodeURIComponent(builder.username || String(builder.id))}`} className="text-foreground hover:text-primary hover:underline">
              {builder.name}
            </Link>
          ) : builder.name}
        </span>
      ))}
    </div>
  );
}