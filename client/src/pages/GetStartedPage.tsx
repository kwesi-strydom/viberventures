import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_unconfigured: 'Google sign-in isn’t set up yet. Try email or NS for now.',
  github_unconfigured: 'GitHub sign-in isn’t set up yet. Try email, Google, or NS for now.',
  no_code: 'Sign-in was cancelled. Please try again.',
  token_exchange: 'We couldn’t complete sign-in. Please try again.',
  google_user: 'We couldn’t read your Google profile. Please try again.',
  github_user: 'We couldn’t read your GitHub profile. Please try again.',
  no_email: 'Your account didn’t share an email. Try a different method.',
  server_error: 'Something went wrong during sign-in. Please try again.',
};

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.31-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.19.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
  </svg>
);

const GetStartedPage = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signup' | 'signin'>(
    searchParams.get('mode') === 'signin' ? 'signin' : 'signup'
  );
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const authError = searchParams.get('auth_error');
    if (authError) {
      toast({
        title: 'Sign-in failed',
        description: AUTH_ERROR_MESSAGES[authError] || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const googleAuth = () => {
    window.location.href = `/api/auth/google?role=audience`;
  };

  const githubAuth = () => {
    window.location.href = `/api/auth/github?role=audience`;
  };

  const nsAuth = async () => {
    try {
      const res = await fetch(`/api/auth/discord/url?role=audience`);
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      window.location.href = `/api/auth/discord`;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
          }),
        });
        if (res.ok) {
          window.location.href = '/me';
        } else {
          const err = await res.json();
          toast({ title: 'Sign up failed', description: err.message || 'Something went wrong', variant: 'destructive' });
        }
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        if (res.ok) {
          window.location.href = '/me';
        } else {
          const err = await res.json();
          toast({ title: 'Sign in failed', description: err.message || 'Check your email and password', variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <div className="arena-wrap py-16 md:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
        {/* Left — what it means to join */}
        <div>
          <span className="kicker text-primary block mb-4">Join the arena</span>
          <h1 className="display mb-6 uppercase" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 0.98 }}>
            Join the Viber community
          </h1>
          <p className="body-l text-muted-foreground mb-8">
            Viber is the builder ecosystem and media network for the AI era — a live
            competition series, a startup launchpad, and a year-round community. No
            Network School account needed to get started.
          </p>

          <ul className="space-y-4">
            {[
              { h: 'Compete', t: 'Build an AI-powered app in 60 minutes and climb the leaderboard.' },
              { h: 'Spectate', t: 'Watch builders ship live, rate the apps, and pick your favorites.' },
              { h: 'Belong', t: 'Stay plugged into a global community of builders all year round.' },
            ].map((item) => (
              <li key={item.h} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                <span>
                  <span className="font-semibold text-foreground uppercase tracking-wide">{item.h}.</span>{' '}
                  <span className="text-muted-foreground">{item.t}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — entry fields */}
        <div className="card">
          <h2 className="h3 uppercase mb-1">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="mono-label mb-6">
            {isSignup ? 'Sign up with email, Google, GitHub, or NS' : 'Sign in to continue'}
          </p>

          {/* OAuth options */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={googleAuth}
              className="w-full flex items-center justify-center gap-3 rounded-md bg-white text-[#1f1f1f] font-semibold py-3 hover:bg-gray-100 transition"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={githubAuth}
              className="w-full flex items-center justify-center gap-3 rounded-md bg-[#1f2328] text-white font-semibold py-3 hover:bg-[#2c333a] transition border border-white/10"
            >
              <GitHubIcon />
              Continue with GitHub
            </button>
            <button
              type="button"
              onClick={nsAuth}
              className="w-full flex items-center justify-center gap-3 rounded-md border border-border py-3 font-semibold text-foreground hover:bg-white/5 transition"
            >
              <img
                src="https://i.postimg.cc/5tmKC0zQ/ns-logo-white.png"
                alt="NS"
                className="h-5 w-auto object-contain"
              />
              Continue with NS
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span className="h-px flex-1 bg-border" />
            <span className="mono-label">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Email form */}
          <form onSubmit={submit}>
            {isSignup && (
              <div className="field mb-4">
                <label>Name*</label>
                <input type="text" name="name" value={form.name} onChange={change} placeholder="Your name" required />
              </div>
            )}

            <div className="field mb-4">
              <label>Email*</label>
              <input type="email" name="email" value={form.email} onChange={change} placeholder="you@email.com" required />
            </div>

            <div className="field mb-4">
              <label>Password*</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={change}
                placeholder={isSignup ? 'Create a password' : 'Your password'}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={isLoading}>
              {isLoading ? 'Please wait…' : isSignup ? 'Sign up now' : 'Sign in'}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-border">
            {isSignup ? (
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('signin')} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                New to Viber?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">
                  Create an account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStartedPage;
