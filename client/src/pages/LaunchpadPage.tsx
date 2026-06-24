import { Link } from 'react-router-dom';
import { Play, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import worldSeriesImg from '@assets/worldseries.jpg';
import codingActionImg from '@assets/viber-coding-action.jpg';
import teamCollabImg from '@assets/viber-team-collab.jpg';
import groupPhotoImg from '@assets/viber-group-photo.jpg';

interface ShowcaseApp {
  title: string;
  creator: string;
  url: string;
  thumbnail: string;
  plays: number;
  tagline: string;
  tag: string;
}

const showcase: ShowcaseApp[] = [
  {
    title: 'Form & Fury: Malaysian Mayhem',
    creator: 'Karol & Juba',
    url: 'https://exquisite-klepon-59a10b.netlify.app/',
    thumbnail: 'https://exquisite-klepon-59a10b.netlify.app/image.png',
    plays: 250,
    tagline: 'A browser-based top-down driving game with dark humor and multiplayer mayhem.',
    tag: 'Game',
  },
  {
    title: 'Network State Maze',
    creator: 'Team 13',
    url: 'https://claude.ai/public/artifacts/b3b21742-fc2d-4a78-bf9b-b599c76ec573',
    thumbnail: 'https://i.postimg.cc/KYw4Z7kR/game.png',
    plays: 250,
    tagline: 'A first-person Pac-man-style maze where you Learn, Earn, and Burn.',
    tag: 'Game',
  },
  {
    title: 'Shit Drop',
    creator: 'Tech Bro Model',
    url: 'https://shitdrop.com',
    thumbnail: 'https://ph-files.imgix.net/8695bd12-05e3-4d05-9921-62af6aa859bd.png',
    plays: 244,
    tagline: 'Catch falling shits using fun hand gestures with your webcam.',
    tag: 'AI / Vision',
  },
  {
    title: 'Habitude App',
    creator: 'Pump & Chump',
    url: 'https://habitudeapp.vercel.app/',
    thumbnail: 'https://i.postimg.cc/6q6Dnx3M/0-3.jpg',
    plays: 240,
    tagline: 'A gamified habit tracker where small teams level up together.',
    tag: 'Productivity',
  },
  {
    title: 'NS Friender',
    creator: 'Dopeness',
    url: 'https://v0-ns-friender-app.vercel.app/',
    thumbnail: 'https://i.postimg.cc/Y9by2mbS/Screenshot-2025-07-18-at-9-37-10-PM.png',
    plays: 233,
    tagline: 'The ultimate connection platform for Network School\u2019s most ambitious minds.',
    tag: 'Social',
  },
  {
    title: 'Vampy\u2019s Halloween Rescue',
    creator: 'Goblin Town',
    url: 'https://Vampys-Revenge.replit.app',
    thumbnail: 'https://i.postimg.cc/4491Gm90/vampy.jpg',
    plays: 223,
    tagline: 'An 80\u2019s style beat-\u2019em-up arcade game built in 60 minutes.',
    tag: 'Game',
  },
  {
    title: 'Crypto Solitaire',
    creator: 'Sven & Evan',
    url: 'https://dulcet-kitsune-b435f6.netlify.app/',
    thumbnail: 'https://i.postimg.cc/4nCF3nq5/crypto-soitaire.png',
    plays: 214,
    tagline: 'Classic solitaire reimagined with a slick crypto-native style.',
    tag: 'Game',
  },
  {
    title: 'Hookit',
    creator: 'Tarzan',
    url: 'https://hookit.lovable.app/',
    thumbnail: 'https://i.postimg.cc/2yhMMYvJ/35F71C7C-8BF3-45BC-B4C4-2423C7D788C5.png',
    plays: 194,
    tagline: 'The fastest way to write hooks that make your videos go viral.',
    tag: 'AI / Marketing',
  },
];

const GLOWS = [
  'radial-gradient(620px 340px at 0% 0%, rgba(249,206,50,0.34), transparent 60%)',
  'radial-gradient(620px 340px at 100% 0%, rgba(242,92,92,0.34), transparent 60%)',
  'radial-gradient(620px 340px at 0% 100%, rgba(47,196,196,0.32), transparent 60%)',
  'radial-gradient(620px 340px at 100% 100%, rgba(139,63,196,0.34), transparent 60%)',
];

const CARD_OVERLAY = 'linear-gradient(180deg, rgba(5,5,9,0.62) 0%, rgba(5,5,9,0.97) 100%)';

const pillars = [
  {
    title: 'Real business scenarios',
    body: 'Actual companies bring live, unsolved problems to the arena. No toy briefs — you build against challenges that matter to a real business.',
    image: codingActionImg,
  },
  {
    title: 'The 36-hour format',
    body: 'A relentless, high-stakes sprint. Endurance meets intensity as teams push from raw problem to shippable solution in a day and a half.',
    image: worldSeriesImg,
  },
  {
    title: 'Teams of four',
    body: 'Small, elite squads sourced with our partners. Complementary strengths, zero passengers — every member earns their place.',
    image: groupPhotoImg,
  },
  {
    title: 'Funding-team material',
    body: "Don't just solve the problem — prove you're investable. The bar isn't a hackathon demo, it's a team founders and backers would bet on.",
    image: teamCollabImg,
  },
];

const steps = [
  {
    title: 'Partners source the challenge',
    body: 'We collaborate with businesses and partners to surface real problems and source the founders best placed to solve them.',
    image: worldSeriesImg,
  },
  {
    title: 'Squads assemble',
    body: 'Founders are matched into teams of four, balanced for complementary skill, ambition, and grit.',
    image: teamCollabImg,
  },
  {
    title: '36 hours in the arena',
    body: 'Teams build relentlessly toward a relevant, real solution under genuine pressure and a competitive edge.',
    image: codingActionImg,
  },
  {
    title: 'Pitch as a venture',
    body: 'Teams present not just a product, but the case for themselves as a founding team worth funding.',
    image: groupPhotoImg,
  },
];

const stats = [
  { value: '36h', label: 'Build window' },
  { value: '4', label: 'Per team' },
  { value: 'Real', label: 'Business briefs' },
  { value: 'Funding', label: 'Ready outcomes' },
];

const ShowcaseCard = ({ app }: { app: ShowcaseApp }) => (
  <a
    href={app.url}
    target="_blank"
    rel="noopener noreferrer"
    className="card hover:border-primary/50 transition group flex flex-col"
  >
    <div className="relative mb-4">
      <img src={app.thumbnail} alt={app.title} className="w-full h-44 object-cover rounded-md" />
      <span className="absolute top-2 left-2 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded bg-black/70 text-primary border border-primary/30">
        {app.tag}
      </span>
    </div>
    <div className="flex items-center justify-between mb-1">
      <h3 className="h4 uppercase">{app.title}</h3>
    </div>
    <p className="text-xs text-muted-foreground mb-2">by {app.creator}</p>
    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{app.tagline}</p>
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1 text-muted-foreground"><Play size={14} className="text-muted-foreground" /> {app.plays} plays</span>
      <span className="flex items-center text-primary font-semibold uppercase tracking-wider text-xs group-hover:gap-2 transition-all">
        Launch <ArrowUpRight size={14} className="ml-1" />
      </span>
    </div>
  </a>
);

const LaunchpadPage = () => {
  const { user } = useAuth();
  useScrollReveal();

  return (
    <div className="arena-wrap py-12 md:py-16">
      {/* Hero */}
      <div className="reveal mb-14">
        <span className="kicker text-primary block mb-2">Founder Launchpad</span>
        <h1 className="display" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1 }}>
          <span style={{ color: 'var(--accent)' }}>36 hours to prove<br />you&rsquo;re funding-team<br />material</span>
        </h1>
        <p className="body-l mt-6 max-w-2xl">
          The Launchpad is our most competitive event format. We partner with real businesses to source founders
          and surface live, high-stakes problems — then teams of four go head-to-head for 36 hours, building
          relevant solutions and proving they&rsquo;re the kind of team backers want to fund.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-8">
          <Link to="/competition" className="btn btn-primary btn-lg">
            See upcoming events
          </Link>
          <a href="#how-it-works" className="btn btn-solid btn-lg">
            How it works
          </a>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
        {stats.map((s, i) => (
          <div key={s.label} className="reveal card text-center py-6" style={{ transitionDelay: `${i * 70}ms` }}>
            <div className="display" style={{ color: 'var(--accent)', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1 }}>
              {s.value}
            </div>
            <div className="kicker text-muted-foreground mt-2">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pillars — built different */}
      <section className="mb-24">
        <div className="reveal text-center mb-12">
          <span className="kicker text-primary block mb-3">Built different</span>
          <h2 className="h2">Not a hackathon. A proving ground.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className="reveal group relative overflow-hidden rounded-2xl border border-border min-h-[300px] flex flex-col justify-end p-7"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <img
                src={p.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500 ease-out"
              />
              <div className="absolute inset-0" style={{ backgroundImage: CARD_OVERLAY }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: GLOWS[i % GLOWS.length] }} />
              <div className="relative z-10">
                <h3 className="h3 mb-2">{p.title}</h3>
                <p className="body-l">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mb-24 scroll-mt-24">
        <h2 className="reveal h2 mb-12 text-center">How the Launchpad works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="reveal group relative overflow-hidden rounded-2xl border border-border p-7 min-h-[300px] flex flex-col justify-end"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <img
                src={s.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500 ease-out"
              />
              <div className="absolute inset-0" style={{ backgroundImage: CARD_OVERLAY }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: GLOWS[i % GLOWS.length] }} />
              <div className="num text-6xl text-primary font-bold opacity-20 absolute top-3 right-4">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="relative z-10">
                <span className="mono-label text-primary block mb-2">Step {i + 1}</span>
                <h3 className="h3 mb-2">{s.title}</h3>
                <p className="body-l">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Partner band */}
      <section className="mb-24">
        <div className="reveal panel p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5"></div>
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          <div className="relative z-10">
            <span className="kicker text-primary block mb-3">For partners</span>
            <h2 className="h2 mb-6">Bring a real challenge. Source real founders.</h2>
            <p className="body-l max-w-xl mx-auto mb-10">
              We work with businesses and ecosystem partners to put genuine problems in front of vetted founder
              teams — and to spot the talent worth backing. If you have a problem worth solving or founders worth
              sourcing, let&rsquo;s build an event together.
            </p>
            <Link to="/competition" className="btn btn-primary btn-lg">
              Explore the events
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center mb-12">
        <div className="reveal card max-w-3xl mx-auto p-12">
          <h2 className="h2 mb-6">Think your team has what it takes?</h2>
          <p className="body-l mb-10">
            The next Launchpad puts four founders, one real business problem, and 36 hours on the line.
            Step into the arena and prove you&rsquo;re funding-team material.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/competition" className="btn btn-primary btn-lg">
              See upcoming events
            </Link>
          </div>
        </div>
      </section>

      {/* Admin-only: legacy apps showcase + explore all apps */}
      {user?.isAdmin && (
        <section className="mt-16 pt-10 border-t border-border">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <span className="kicker text-muted-foreground block mb-1">Admin only</span>
              <h2 className="h3 uppercase">Breakout app showcase</h2>
            </div>
            <Link to="/games" className="btn btn-ghost">
              Explore all apps
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {showcase.map((app) => <ShowcaseCard key={app.title} app={app} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default LaunchpadPage;
