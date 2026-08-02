import { Trophy, Crown, Medal, Award, ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

/* ──────────────────────────────────────────────────────────────
   Official Viber Hall of Fame — curated winner data per edition.
   These placements reflect the actual competition outcomes as
   confirmed by the organisers (voting anomalies in early editions
   have been corrected where stated).
   ────────────────────────────────────────────────────────────── */

export type Winner = {
  rank: number;
  title: string;
  team: string;
  url: string;
  thumbnail: string;
  description?: string;
};

export type EditionConfig = {
  name: string;
  subtitle: string;
  banner?: string;
  winners: Winner[];
};

export const EDITIONS: Record<string, EditionConfig> = {
  'fifa-world-cup': {
    name: 'Viber FIFA World Cup',
    subtitle: 'The football-themed vibecoding special edition',
    banner: '/winners/fifa-banner.png',
    winners: [
      {
        rank: 1,
        title: 'World Cup Aura',
        team: 'Bobby D & Jonathan Foltz',
        url: 'https://WorldCupAura.replit.app',
        thumbnail: 'https://i.postimg.cc/KYRW7pz0/Screenshot-2026-06-19-at-8-38-13-AM.png',
        description: 'Turn your selfie into a legendary fan card. Pick your nation. Reveal your power level.',
      },
      {
        rank: 2,
        title: 'SolStars',
        team: 'Team 15',
        url: 'https://solstars.vercel.app/',
        thumbnail: 'https://i.postimg.cc/1RLpCCz6/Screenshot-2026-06-19-at-20-17-20.png',
        description: 'A football card collection game built on Solana — rip packs, own cards, battle on-chain.',
      },
      {
        rank: 3,
        title: 'Fifa Chess',
        team: 'Team 18',
        url: 'https://fifachess.replit.app',
        thumbnail: 'https://i.postimg.cc/y8ZBhTdz/3cf5fc6e-30da-4aec-b0fc-36c2116ff432.png',
        description: 'Football meets chess in a strategic World Cup showdown.',
      },
      {
        rank: 4,
        title: 'FIFA Cards Clash',
        team: 'Fantastic Duo',
        url: 'https://fifa-card-clash.lovable.app/',
        thumbnail: 'https://i.postimg.cc/fLX06d5j/fifa-card-clash-thumbnail.png',
        description: 'Collect, clash and conquer with your ultimate FIFA card deck.',
      },
    ],
  },
  'viber-4': {
    name: 'Viber 4',
    subtitle: 'The China-themed vibecoding championship',
    banner: '/winners/viber-4-banner.png',
    winners: [
      {
        rank: 1,
        title: 'Temu Therapist',
        team: 'Team 4',
        url: 'https://temu-therapist.netlify.app/',
        thumbnail: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQb-XEpiqQOcLIuIQiOUBsDDTsJ5ruVOlgZdg&s',
        description: 'Solve your problems with Temu therapy. The crowd favourite of Viber 4.',
      },
      {
        rank: 2,
        title: 'Social Credit Scanner',
        team: 'Team 3',
        url: 'https://noevafoundation.github.io/idea-2/',
        thumbnail: 'https://i.postimg.cc/NfyxmRvn/PHOTO-2026-05-16-05-02-37.jpg',
        description: 'The Ministry of Network States now offers civilian compliance assessments. Aim. Scan. Receive sentencing.',
      },
      {
        rank: 3,
        title: 'Neon Wushu Rush',
        team: 'Get your match',
        url: 'https://neon-wushu-rush.replit.app/',
        thumbnail: 'https://i.postimg.cc/FRqCtvtN/ig-0e6363237af030a7016a08640abeb881918f785005c4f55452.png',
        description: 'A wushu dancer races through a lantern-lit cyberpunk Chinese city, collecting glowing dance moves.',
      },
    ],
  },
  'viber-3': {
    name: 'Viber Halloween',
    subtitle: 'The spooky vibecoding special edition',
    banner: '/winners/viber-3-banner.png',
    winners: [
      {
        rank: 1,
        title: 'NS Red Flag Detector',
        team: 'Sara & Emily',
        url: 'https://flagfinder-ns.lovable.app/',
        thumbnail: 'https://i.postimg.cc/5twMDwJV/NS-Red-Flag.png',
        description: 'We automated gossip. People at NS spend half their time figuring out who\u2019s legit. We built an AI that just tells you.',
      },
    ],
  },
  'viber-2': {
    name: 'Viber 2',
    subtitle: 'The second vibecoding championship',
    banner: '/winners/viber-2-banner.png',
    winners: [
      {
        rank: 1,
        title: 'NS News',
        team: 'Team Star',
        url: 'https://v0-ns-news-hackathon-app.vercel.app/',
        thumbnail: 'https://i.postimg.cc/ydXDYjdt/366-D40-A6-EBBF-48-BD-8-B2-A-349-B6-FBB1-B6-B.jpg',
        description: 'NS news — a platform where everyone can announce anything about NS to the NS world.',
      },
      {
        rank: 2,
        title: 'Flappy Debbie',
        team: 'Pure Positivity',
        url: 'https://flappy-fairy-copal.replit.app/',
        thumbnail: 'https://i.postimg.cc/qBhBZsvK/IMG-9083.jpg',
        description: 'Debbie is flying! Grab the Bitcoin, booze and poker chips while avoiding the pipes.',
      },
      {
        rank: 3,
        title: 'NS Cup Relay',
        team: 'Team NSCUP RELAY',
        url: 'https://chaos-runner-wd2147.replit.app/',
        thumbnail: 'https://kubrick.htvapps.com/htv-prod-media.s3.amazonaws.com/ibmig/cms/image/wcvb/32126856-32126856.jpg?crop=1xw:0.93103448275862066xh;center,top&resize=900:*',
        description: 'An accurate representation of what the NS Cup Relay would have been.',
      },
    ],
  },
  'viber-1': {
    name: 'Viber 1',
    subtitle: 'The inaugural vibecoding championship',
    banner: '/winners/viber-1-banner.png',
    winners: [
      {
        rank: 1,
        title: 'Sperm Racer',
        team: 'Jake & Andy',
        url: 'https://spermracer.vercel.app/',
        thumbnail: 'https://excelivf.com/wp-content/uploads/2024/09/How-to-Make-Sperm-Stronger-for-a-Healthy-Pregnancy-Dr-Rhythm-Gupta-IVF-Specialist-in-Delhi-Excel-IVF-01.jpg',
        description: 'Who at NS has the fastest sperm? The very first Viber champion.',
      },
    ],
  },
};

export const MEDAL = {
  1: { color: '#f9a826', label: 'CHAMPION', Icon: Crown },
  2: { color: '#c3c9d2', label: 'RUNNER-UP', Icon: Medal },
  3: { color: '#cd7f32', label: 'THIRD PLACE', Icon: Medal },
  4: { color: '#8a93a0', label: 'FOURTH PLACE', Icon: Award },
} as const;

const Champion = ({ w, editionName }: { w: Winner; editionName: string }) => {
  const m = MEDAL[1];
  return (
    <a
      href={w.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden border-2 transition-transform hover:-translate-y-1"
      style={{
        borderColor: m.color,
        background: 'var(--ink-800)',
        boxShadow: `0 0 40px ${m.color}33`,
      }}
    >
      <div className="grid md:grid-cols-2">
        <div className="relative aspect-video md:aspect-auto md:min-h-[320px] overflow-hidden bg-ink-700">
          <img
            src={w.thumbnail}
            alt={w.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest"
            style={{ background: m.color, color: 'var(--accent-ink)' }}
          >
            <Crown size={16} /> {m.label}
          </div>
        </div>

        <div className="p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} style={{ color: m.color }} />
            <span className="mono-label" style={{ color: m.color }}>
              {editionName} · #1 Winner
            </span>
          </div>
          <h2 className="h2 mb-2 group-hover:text-primary transition-colors">{w.title}</h2>
          <div className="mono-label mb-4">{w.team}</div>
          {w.description && (
            <p className="body-l text-ink-200 mb-6">{w.description}</p>
          )}
          <span
            className="btn btn-solid self-start"
            style={{ background: m.color, color: 'var(--accent-ink)', borderColor: m.color }}
          >
            Play App <ExternalLink size={16} className="ml-2" />
          </span>
        </div>
      </div>
    </a>
  );
};

const RunnerCard = ({ w }: { w: Winner }) => {
  const m = MEDAL[w.rank as 2 | 3 | 4];
  const { Icon } = m;
  return (
    <a
      href={w.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg overflow-hidden border transition-transform hover:-translate-y-1"
      style={{ borderColor: 'var(--ink-600)', background: 'var(--ink-800)' }}
    >
      <div className="relative aspect-video overflow-hidden bg-ink-700">
        <img
          src={w.thumbnail}
          alt={w.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{ background: m.color, color: 'var(--accent-ink)' }}
        >
          <Icon size={14} /> #{w.rank}
        </div>
      </div>
      <div className="p-5">
        <div className="mono-label mb-2" style={{ color: m.color }}>
          {m.label}
        </div>
        <h3 className="h3 mb-1 group-hover:text-primary transition-colors">{w.title}</h3>
        <div className="mono-label mb-3">{w.team}</div>
        {w.description && (
          <p className="text-sm text-ink-300 line-clamp-2 mb-4">{w.description}</p>
        )}
        <span className="inline-flex items-center text-sm font-bold uppercase tracking-wide" style={{ color: m.color }}>
          Play App <ExternalLink size={14} className="ml-2" />
        </span>
      </div>
    </a>
  );
};

const HallOfFameLanding = () => {
  const editions = [
    { slug: 'fifa-world-cup', name: 'Viber FIFA World Cup', count: 4, color: '#4ade80' },
    { slug: 'viber-4', name: 'Viber 4', count: 3, color: '#f9a826' },
    { slug: 'viber-3', name: 'Viber Halloween', count: 1, color: '#a855f7' },
    { slug: 'viber-2', name: 'Viber 2', count: 3, color: '#f9a826' },
    { slug: 'viber-1', name: 'Viber 1', count: 1, color: '#f9a826' },
  ];

  return (
    <div className="arena-wrap py-12 min-h-screen">
      <div className="text-center mb-14 border-b border-ink-600 pb-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy className="w-8 h-8" style={{ color: '#f9a826' }} />
          <span className="mono-label" style={{ color: '#f9a826' }}>
            Hall of Fame
          </span>
        </div>
        <h1 className="h1 mb-3">Winning Teams</h1>
        <p className="body-l text-ink-300 max-w-2xl mx-auto">
          Every champion from every Viber vibecoding championship. From the inaugural Sperm Racer
          to the FIFA World Cup arena — here are the apps that took the crown.
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid gap-5">
        {editions.map((ed) => (
          <Link
            key={ed.slug}
            to={`/winners/${ed.slug}`}
            className="group card p-0 overflow-hidden hover:border-primary/50 transition flex flex-col md:flex-row"
          >
            <div
              className="md:w-2 flex-shrink-0"
              style={{ background: ed.color }}
            />
            <div className="p-6 md:p-8 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="h3 group-hover:text-primary transition-colors">{ed.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Top {ed.count} {ed.count === 1 ? 'winner' : 'winners'} showcased
                </p>
              </div>
              <span className="inline-flex items-center text-sm font-bold uppercase tracking-wide text-primary group-hover:gap-2 transition-all">
                View winners <ExternalLink size={14} className="ml-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const EditionWinners = ({ slug }: { slug: string }) => {
  const config = EDITIONS[slug];
  if (!config) {
    return (
      <div className="arena-wrap py-12 min-h-screen text-center">
        <h1 className="h1 mb-4">Edition not found</h1>
        <p className="text-muted-foreground mb-6">We don&apos;t have winner data for that competition yet.</p>
        <Link to="/winners" className="btn btn-primary">
          <ArrowLeft size={16} className="mr-2" /> Back to Hall of Fame
        </Link>
      </div>
    );
  }

  const champion = config.winners.find((w) => w.rank === 1)!;
  const runners = config.winners.filter((w) => w.rank !== 1);

  return (
    <div className="arena-wrap py-12 min-h-screen">
      <div className="mb-6">
        <Link to="/winners" className="inline-flex items-center text-muted-foreground hover:text-foreground text-sm mb-6">
          <ArrowLeft size={16} className="mr-1" /> Hall of Fame
        </Link>
      </div>

      {/* Hero banner */}
      {config.banner && (
        <div className="relative w-full h-48 md:h-64 lg:h-72 rounded-xl overflow-hidden mb-10">
          <img
            src={config.banner}
            alt={`${config.name} banner`}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5" style={{ color: '#f9a826' }} />
              <span className="mono-label" style={{ color: '#f9a826' }}>
                {config.name}
              </span>
            </div>
            <h1 className="h1 mb-1" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>Winning Teams</h1>
            <p className="body-l text-white/80 max-w-xl">{config.subtitle}</p>
          </div>
        </div>
      )}

      {!config.banner && (
        <div className="text-center mb-12 border-b border-ink-600 pb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="w-8 h-8" style={{ color: '#f9a826' }} />
            <span className="mono-label" style={{ color: '#f9a826' }}>
              {config.name}
            </span>
          </div>
          <h1 className="h1 mb-3">Winning Teams</h1>
          <p className="body-l text-ink-300 max-w-2xl mx-auto">
            {config.subtitle}
          </p>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-10">
        <Champion w={champion} editionName={config.name} />

        {runners.length > 0 && (
          <div className={`grid gap-6 ${runners.length === 2 ? 'md:grid-cols-2' : runners.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-3'}`}>
            {runners.map((w) => (
              <RunnerCard key={w.rank} w={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const WinnersPage = () => {
  const { slug } = useParams<{ slug?: string }>();

  if (!slug) {
    return <HallOfFameLanding />;
  }

  return <EditionWinners slug={slug} />;
};

export default WinnersPage;
