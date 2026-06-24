import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, Users, Trophy, Star, CreditCard, Bitcoin, ArrowLeft, Copy, Calendar, PlayCircle, Film, Gamepad2, Radio, ArrowRight } from 'lucide-react';
import { CURRENT_EDITION } from '@shared/schema';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface EventDetail {
  id: number;
  edition: number;
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  status: 'upcoming' | 'live' | 'past';
  thumbnailUrl?: string | null;
  startDate?: string | null;
  recapUrl?: string | null;
  videoUrl?: string | null;
  registrationUrl?: string | null;
  entryFeeCents: number;
  currency: string;
  cryptoWalletAddress?: string | null;
  competitorCount: number;
  spectatorCount: number;
}

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

interface ResultRow {
  id: string;
  title: string;
  creator: string | null;
  avg_rating: number;
  rating_count: number;
  rank: number;
}

interface DashboardEntry {
  participation: { id: number; role: string; teamName?: string | null; paymentStatus: string; eventId: number };
  event: { id: number } | null;
}

const feeLabel = (cents: number, currency: string) =>
  cents > 0 ? (cents / 100).toLocaleString(undefined, { style: 'currency', currency: currency.toUpperCase() }) : 'Free';

const EventDetailPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState<'spectator' | 'competitor'>('spectator');
  const [teamName, setTeamName] = useState('');
  const [payMethod, setPayMethod] = useState<'card' | 'crypto'>('card');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [needPayment, setNeedPayment] = useState(false);

  const { data: event, isLoading } = useQuery<EventDetail>({ queryKey: [`/api/events/${slug}`] });
  const { data: results } = useQuery<ResultRow[]>({ queryKey: [`/api/events/${slug}/results`], enabled: !!slug });
  const { data: dashboard } = useQuery<{ participations: DashboardEntry[] }>({
    queryKey: ['/api/me/dashboard'],
    enabled: !!user,
  });

  if (isLoading || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Loading event</span>
      </div>
    );
  }

  const myEntry = dashboard?.participations.find((p) => p.event?.id === event.id || p.participation.eventId === event.id);
  const isPast = event.status === 'past';
  const hasFee = event.entryFeeCents > 0;

  const finishCompetitor = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] });
    navigate('/onboarding');
  };

  const joinSpectator = async () => {
    if (!user) return navigate('/get-started');
    setBusy(true);
    try {
      await apiRequest(`/api/events/${slug}/join`, {
        method: 'POST',
        body: JSON.stringify({ role: 'spectator' }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/dashboard'] });
      if (event.registrationUrl) {
        toast({
          title: "You're registered as a spectator!",
          description: 'Taking you to Network School to finish registering at the venue…',
        });
        window.location.href = event.registrationUrl;
        return;
      }
      toast({ title: "You're in!", description: `Joined ${event.name} as a spectator.` });
      navigate('/me');
    } catch {
      toast({ title: 'Could not join', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const joinCompetitor = async () => {
    if (!user) return navigate('/get-started');
    if (!teamName.trim()) {
      toast({ title: 'Team name required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequest(`/api/events/${slug}/join`, {
        method: 'POST',
        body: JSON.stringify({ role: 'competitor', teamName: teamName.trim() }),
      });
      if (res.requiresPayment) {
        setNeedPayment(true);
      } else {
        finishCompetitor();
      }
    } catch {
      toast({ title: 'Could not join', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const payCard = async () => {
    setBusy(true);
    try {
      const res = await apiRequest(`/api/events/${slug}/pay/checkout`, { method: 'POST', body: '{}' });
      if (res.alreadyPaid) return finishCompetitor();
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      toast({ title: 'Could not start checkout', variant: 'destructive' });
    } catch (e: any) {
      toast({
        title: 'Card payment unavailable',
        description: 'Card payments aren’t set up for this event yet. Try crypto or contact the organizer.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const payCrypto = async () => {
    if (!txHash.trim()) {
      toast({ title: 'Transaction hash required', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/api/events/${slug}/pay/crypto`, {
        method: 'POST',
        body: JSON.stringify({ txHash: txHash.trim() }),
      });
      toast({ title: 'Submitted!', description: 'An organizer will confirm your payment shortly.' });
      finishCompetitor();
    } catch {
      toast({ title: 'Could not submit', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const copyWallet = () => {
    if (event.cryptoWalletAddress) {
      navigator.clipboard.writeText(event.cryptoWalletAddress);
      toast({ title: 'Wallet address copied' });
    }
  };

  return (
    <div className="arena-wrap py-12 md:py-16">
      <Link to="/competition" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 text-sm">
        <ArrowLeft size={16} className="mr-1" /> All competitions
      </Link>

      {event.thumbnailUrl && (
        <img src={event.thumbnailUrl} alt={event.name} className="w-full h-56 object-cover rounded-lg mb-8" />
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: info + results */}
        <div className="lg:col-span-2">
          <h1 className="display uppercase mb-3" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 1 }}>
            {event.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground mb-6">
            {fmtDate(event.startDate) && <span className="flex items-center gap-1"><Calendar size={14} /> {fmtDate(event.startDate)}</span>}
            {event.location && <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>}
            <span className="flex items-center gap-1"><Users size={14} /> {event.competitorCount} competitors · {event.spectatorCount} spectators</span>
            <span className="font-semibold text-foreground">{hasFee ? `${feeLabel(event.entryFeeCents, event.currency)} entry` : 'Free entry'}</span>
          </div>
          {event.description && <p className="body-l text-muted-foreground mb-8">{event.description}</p>}

          {(event.recapUrl || event.videoUrl) && (
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {event.recapUrl && (
                <a href={event.recapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost border border-border">
                  <PlayCircle size={16} className="mr-2 text-primary" /> Watch the recap
                </a>
              )}
              {event.videoUrl && (
                <a href={event.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost border border-border">
                  <Film size={16} className="mr-2 text-primary" /> Highlight video
                </a>
              )}
            </div>
          )}

          {/* Explore this competition — only once there's something to explore */}
          {event.status !== 'upcoming' && (
          <div className="mb-8">
            <h2 className="h3 uppercase mb-4">Explore this competition</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                to={`/games?edition=${event.edition}&from=${event.slug}`}
                className="card flex items-center gap-3 hover:border-primary/50 transition group"
              >
                <div className="w-10 h-10 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Gamepad2 size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold uppercase tracking-wide text-sm">Apps</div>
                  <div className="text-xs text-muted-foreground">Browse & rate the submissions</div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition" />
              </Link>

              <Link
                to={`/roster?edition=${event.edition}&from=${event.slug}`}
                className="card flex items-center gap-3 hover:border-primary/50 transition group"
              >
                <div className="w-10 h-10 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold uppercase tracking-wide text-sm">Competitors</div>
                  <div className="text-xs text-muted-foreground">The builders & teams in the arena</div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition" />
              </Link>

              {event.edition === CURRENT_EDITION && (
                <Link
                  to="/winners"
                  className="card flex items-center gap-3 hover:border-primary/50 transition group"
                >
                  <div className="w-10 h-10 rounded-md bg-[#f9a826]/15 border border-[#f9a826]/30 flex items-center justify-center shrink-0">
                    <Trophy size={18} className="text-[#f9a826]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold uppercase tracking-wide text-sm">Winners</div>
                    <div className="text-xs text-muted-foreground">The championship bracket</div>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition" />
                </Link>
              )}

              {event.status === 'live' && (
                <Link
                  to="/dashboard"
                  className="card flex items-center gap-3 hover:border-primary/50 transition group"
                >
                  <div className="w-10 h-10 rounded-md bg-pos/15 border border-pos/30 flex items-center justify-center shrink-0">
                    <Radio size={18} className="text-pos" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold uppercase tracking-wide text-sm">Live</div>
                    <div className="text-xs text-muted-foreground">Watch the action in real time</div>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition" />
                </Link>
              )}
            </div>
          </div>
          )}

          {event.status !== 'upcoming' && results && results.length > 0 && (
            <div>
              <h2 className="h3 uppercase mb-4 flex items-center gap-2">
                <Trophy size={20} className="text-[#f9a826]" /> Leaderboard &amp; winners
              </h2>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">App</th>
                      <th className="px-4 py-3 font-semibold">Team</th>
                      <th className="px-4 py-3 font-semibold text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 display text-lg text-primary">{r.rank}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{r.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.creator || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-primary font-semibold">
                            <Star size={14} /> {r.avg_rating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground ml-2">({r.rating_count})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: join panel */}
        <div className="lg:col-span-1">
          <div className="card lg:sticky lg:top-24">
            {!user ? (
              <>
                <h2 className="h3 uppercase mb-2">Join this event</h2>
                <p className="text-muted-foreground mb-5">Sign in or create an account to join.</p>
                <Link to="/get-started" className="btn btn-primary btn-lg w-full">Get started</Link>
              </>
            ) : myEntry && !(myEntry.participation.role === 'competitor' && myEntry.participation.paymentStatus === 'pending' && needPayment) ? (
              <>
                <h2 className="h3 uppercase mb-2">You're in</h2>
                <p className="text-muted-foreground mb-2">
                  You joined as a <span className="text-foreground font-semibold uppercase">{myEntry.participation.role}</span>.
                </p>
                {myEntry.participation.role === 'competitor' && myEntry.participation.paymentStatus === 'pending' ? (
                  <>
                    <p className="text-[#f9a826] text-sm mb-4">
                      Your entry fee isn't confirmed yet. Complete payment to lock in your spot.
                    </p>
                    <button onClick={() => setNeedPayment(true)} className="btn btn-primary w-full mb-3">
                      Complete payment
                    </button>
                    <Link to="/me" className="btn btn-ghost w-full">Go to my dashboard</Link>
                  </>
                ) : (
                  <Link to="/me" className="btn btn-primary w-full">Go to my dashboard</Link>
                )}
              </>
            ) : isPast ? (
              <>
                <h2 className="h3 uppercase mb-2">Event ended</h2>
                <p className="text-muted-foreground">This event has finished. Check the results.</p>
              </>
            ) : needPayment ? (
              <>
                <h2 className="h3 uppercase mb-1">Entry fee</h2>
                <p className="mono-label mb-5">{feeLabel(event.entryFeeCents, event.currency)} to compete</p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`rounded-md border py-3 font-semibold flex items-center justify-center gap-2 transition ${payMethod === 'card' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    <CreditCard size={16} /> Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('crypto')}
                    className={`rounded-md border py-3 font-semibold flex items-center justify-center gap-2 transition ${payMethod === 'crypto' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    <Bitcoin size={16} /> Crypto
                  </button>
                </div>

                {payMethod === 'card' ? (
                  <button onClick={payCard} disabled={busy} className="btn btn-primary btn-lg w-full">
                    {busy ? 'Please wait…' : 'Pay with card'}
                  </button>
                ) : (
                  <div>
                    {event.cryptoWalletAddress ? (
                      <>
                        <label className="mono-label block mb-2">Send to this wallet</label>
                        <button onClick={copyWallet} className="w-full flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 mb-4 text-sm break-all hover:border-primary/50">
                          <span className="truncate">{event.cryptoWalletAddress}</span>
                          <Copy size={14} className="shrink-0 text-muted-foreground" />
                        </button>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm mb-4">Ask the organizer for the payment wallet.</p>
                    )}
                    <div className="field mb-4">
                      <label>Transaction hash</label>
                      <input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x…" />
                    </div>
                    <button onClick={payCrypto} disabled={busy} className="btn btn-primary btn-lg w-full">
                      {busy ? 'Please wait…' : 'Submit transaction'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="h3 uppercase mb-4">Join this event</h2>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {(['spectator', 'competitor'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-md border py-3 font-semibold capitalize transition ${role === r ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {role === 'spectator' ? (
                  <>
                    <p className="text-muted-foreground text-sm mb-5">
                      Watch builders ship live and rate the apps. Free and instant — we'll send you to Network School to finish registering for the venue.
                    </p>
                    <button onClick={joinSpectator} disabled={busy} className="btn btn-primary btn-lg w-full">
                      {busy ? 'Please wait…' : 'Register as spectator'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground text-sm mb-4">
                      Build an app in 60 minutes. {hasFee ? `${feeLabel(event.entryFeeCents, event.currency)} entry fee.` : 'Free entry.'} You'll set up your team next.
                    </p>
                    <div className="field mb-4">
                      <label>Team name*</label>
                      <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g., Team Rocket" />
                    </div>
                    <button onClick={joinCompetitor} disabled={busy} className="btn btn-primary btn-lg w-full">
                      {busy ? 'Please wait…' : hasFee ? 'Continue to payment' : 'Register as competitor'}
                    </button>
                  </>
                )}

                {event.registrationUrl && (
                  <div className="mt-5 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
                    <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                    <span>
                      Don't forget to also register on{' '}
                      <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                        Network School
                      </a>
                      {' '}— the host venue where the event takes place.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
