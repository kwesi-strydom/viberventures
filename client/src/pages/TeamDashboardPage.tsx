import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, Upload, ExternalLink, Image as ImageIcon, ArrowLeft, Edit3, Save } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Teammate {
  id: number;
  name: string;
  username?: string | null;
  userType?: string;
  edition?: number | null;
  profilePublic?: boolean | null;
  country?: string | null;
  flag?: string | null;
  tagline?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  avatarUrl?: string | null;
}

interface TeamGame {
  id: string;
  title: string;
  description: string;
  game_url: string;
  thumbnail_url?: string | null;
  creator?: string | null;
}

const TeamDashboardPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: myTeam, isLoading: teamLoading } = useQuery<{ teamName?: string | null; teammate?: string | null }>({
    queryKey: ['/api/my-team'],
    enabled: !!user,
  });

  const teamName = myTeam?.teamName;
  const teamSlug = teamName?.toLowerCase().replace(/^team\s+/i, '').replace(/\s+/g, '-') || '';

  // Resolve team ID from teams table
  const { data: teams } = useQuery<Array<{ id: number; name: string; slug: string }>>({
    queryKey: ['/api/all-teams'],
    enabled: !!teamName,
  });
  const myTeamRecord = teams?.find(t => t.slug === teamSlug);
  const teamId = myTeamRecord?.id;

  const { data: teamData, isLoading: matesLoading } = useQuery<{ slug: string; teamName: string; members: Teammate[] }>({
    queryKey: [`/api/teams/${teamSlug}`],
    enabled: !!teamSlug,
  });
  const teammates = teamData?.members;

  const { data: game, isLoading: gameLoading } = useQuery<TeamGame>({
    queryKey: [`/api/teams/${teamId}/game`],
    enabled: !!teamId,
    retry: false,
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (game) {
      setTitle(game.title);
      setDescription(game.description);
      setGameUrl(game.game_url);
      setThumbUrl(game.thumbnail_url || '');
    } else {
      setTitle('');
      setDescription('');
      setGameUrl('');
      setThumbUrl('');
    }
    setEditing(true);
  };

  const saveGame = async () => {
    if (!teamId) return;
    if (!title.trim() || !description.trim() || !gameUrl.trim()) {
      toast({ title: 'Fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await apiRequest(`/api/teams/${teamId}/game`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          game_url: gameUrl.trim(),
          thumbnail_url: thumbUrl.trim() || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/game`] });
      toast({ title: game ? 'App updated' : 'App submitted' });
      setEditing(false);
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (teamLoading || matesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading team</span>
      </div>
    );
  }

  if (!teamName) {
    return (
      <div className="arena-wrap py-20 text-center">
        <Users size={40} className="mx-auto text-muted-foreground mb-4" />
        <h2 className="h2 uppercase mb-2">No team yet</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Teams are assigned live on competition day. Head to the waiting room while you wait.
        </p>
        <Link to="/v5/waiting-room" className="btn btn-primary">Go to waiting room</Link>
      </div>
    );
  }

  const meId = user?.id ?? -1;
  const mate = teammates?.find(m => m.id !== meId);

  return (
    <div className="arena-wrap py-10 md:py-14">
      <Link to="/v5/waiting-room" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-6 transition">
        <ArrowLeft size={14} /> Back to waiting room
      </Link>

      <div className="mb-8">
        <span className="kicker text-primary block mb-1">Team Dashboard</span>
        <h1 className="display uppercase" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', lineHeight: 1 }}>
          {teamName}
        </h1>
      </div>

      {/* Teammate cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
         {teammates?.map(m => {
           const content = (
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full overflow-hidden border border-border bg-card shrink-0 flex items-center justify-center">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="display text-xl text-primary">{(m.name || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="font-bold text-foreground">{m.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{m.flag || ''}</span>
                  <span>{m.country || ''}</span>
                </div>
                {m.tagline && <p className="text-xs text-muted-foreground mt-0.5">{m.tagline}</p>}
                <div className="flex gap-2 mt-1">
                  {m.twitter && <span className="text-xs text-primary">@{m.twitter}</span>}
                  {m.instagram && <span className="text-xs text-primary">@{m.instagram}</span>}
                </div>
              </div>
            </div>
           );
           return m.userType === 'competitor' && (m.edition ?? 0) >= 5 && m.profilePublic !== false ? (
             <Link key={m.id} to={`/builders/${encodeURIComponent(m.username || String(m.id))}`} className="card p-4 hover:border-primary/40 transition">{content}</Link>
           ) : <div key={m.id} className="card p-4">{content}</div>;
         })}
      </div>

      {/* App upload / edit */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="h3 uppercase">App submission</h2>
          {!editing && (
            <button onClick={startEdit} className="btn btn-ghost border border-primary/40 text-primary text-xs">
              <Edit3 size={14} className="mr-1" />
              {game ? 'Edit app' : 'Submit app'}
            </button>
          )}
        </div>

        {editing ? (
          <div className="grid gap-4">
            <div>
              <label className="mono-label mb-1.5 block">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="App name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mono-label mb-1.5 block">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="One-line description" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mono-label mb-1.5 block">Game URL</label>
              <input type="url" value={gameUrl} onChange={e => setGameUrl(e.target.value)} placeholder="https://..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mono-label mb-1.5 block">Thumbnail URL</label>
              <input type="url" value={thumbUrl} onChange={e => setThumbUrl(e.target.value)} placeholder="https://... (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={saveGame} disabled={saving} className="btn btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                {game ? 'Update app' : 'Submit app'}
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        ) : game ? (
          <div className="flex items-start gap-4">
            {game.thumbnail_url ? (
              <img src={game.thumbnail_url} alt="" className="w-24 h-24 rounded-md object-cover border border-border shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-md bg-ink-800 border border-border flex items-center justify-center shrink-0">
                <ImageIcon size={28} className="text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-foreground">{game.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{game.description}</p>
              <a href={game.game_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-sm mt-2 hover:underline">
                <ExternalLink size={14} /> Open app
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No app submitted yet. Either teammate can submit.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDashboardPage;
