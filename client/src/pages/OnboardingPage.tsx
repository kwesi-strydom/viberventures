import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Globe, Shirt, User as UserIcon, Flag, Coins, Banknote, Copy, ArrowRight, PartyPopper, Users } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, SHIRT_SIZES } from '@/lib/countries';
import heroImg from '@assets/Builders_1782099496016.jpeg';

interface SafeUser {
  id: number;
  name?: string;
  discordUsername?: string;
  country?: string;
  flag?: string;
  shirtSize?: string;
  onboarded?: boolean;
  userType: string;
}

const WALLET = '2sse9zhMhUXwa3t8s6RjUu5hc5LNsfo8YTBRBqXX7BYE';
const FEE_LABEL = '25 USDC';

type Step = 'info' | 'payment' | 'done';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<SafeUser>({ queryKey: ['/api/my-team'] });

  const [step, setStep] = useState<Step>('info');

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [flag, setFlag] = useState('');
  const [shirtSize, setShirtSize] = useState('');

  const [payMethod, setPayMethod] = useState<'crypto' | 'cash'>('crypto');
  const [solscanUrl, setSolscanUrl] = useState('');

  useEffect(() => {
    if (user) {
      setName(prev => prev || user.name || user.discordUsername || '');
      setCountry(prev => prev || user.country || '');
      setFlag(prev => prev || user.flag || '');
      setShirtSize(prev => prev || user.shirtSize || '');
    }
  }, [user]);

  // When a country is picked and no flag chosen yet, default the flag to it.
  useEffect(() => {
    if (country && !flag) {
      const c = COUNTRIES.find(c => c.name === country);
      if (c) setFlag(c.flag);
    }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = useMutation({
    mutationFn: () =>
      apiRequest('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({ name, country, flag, shirtSize }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-team'] });
      setStep('payment');
    },
    onError: (err: any) =>
      toast({ title: err?.message || 'Something went wrong', variant: 'destructive' }),
  });

  const completeOnboarding = useMutation({
    mutationFn: () =>
      apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
          method: payMethod,
          solscanUrl: payMethod === 'crypto' ? solscanUrl : undefined,
        }),
      }),
    onSuccess: () => {
      // Let the guard keep us on /onboarding so the congrats screen shows,
      // even though the user is now onboarded.
      sessionStorage.setItem('viber_onboarding_celebrate', '1');
      queryClient.invalidateQueries({ queryKey: ['/api/my-team'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setStep('done');
    },
    onError: (err: any) =>
      toast({ title: err?.message || 'Something went wrong', variant: 'destructive' }),
  });

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !country || !flag || !shirtSize) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    saveProfile.mutate();
  };

  const handlePay = () => {
    if (payMethod === 'crypto' && !solscanUrl.trim()) {
      toast({ title: 'Paste the Solscan link to your payment', variant: 'destructive' });
      return;
    }
    completeOnboarding.mutate();
  };

  const copyWallet = () => {
    navigator.clipboard.writeText(WALLET);
    toast({ title: 'Wallet address copied' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="arena-wrap flex flex-col items-center justify-center min-h-[80vh] py-10">
      <div className="card w-full max-w-lg p-0 overflow-hidden border-border bg-ink-800">
        <div className="h-48 md:h-56 img-darken">
          <img src={heroImg} alt="Viber competition" className="w-full h-full object-cover" />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {(['info', 'payment', 'done'] as Step[]).map((s, i) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  step === s ? 'w-8 bg-primary' : (['info', 'payment', 'done'].indexOf(step) > i ? 'w-8 bg-primary/50' : 'w-4 bg-border')
                }`}
              />
            ))}
          </div>

          {step === 'info' && (
            <>
              <h1 className="h2 mb-3 text-center">Welcome to Viber 5</h1>
              <p className="text-muted-foreground text-sm text-center mb-8 leading-relaxed">
                Congratulations on joining Viber. This is a unique experience, and joining as a
                competitor is the best way to make the most of it. Please provide your details below so
                our team can onboard you on the launchpad and prepare your custom-made Viber t-shirt for
                the competition — with your name and your flag.
              </p>

              <form onSubmit={handleInfoSubmit} className="space-y-6">
                <div className="field">
                  <label className="flex items-center gap-2">
                    <UserIcon size={14} className="text-primary" /> Your Name
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="field">
                  <label className="flex items-center gap-2">
                    <Globe size={14} className="text-primary" /> Country
                  </label>
                  <select value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="">Select your country…</option>
                    {COUNTRIES.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="flex items-center gap-2">
                    <Flag size={14} className="text-primary" /> Flag You Want to Represent
                  </label>
                  <select value={flag} onChange={e => setFlag(e.target.value)}>
                    <option value="">Select a flag…</option>
                    {COUNTRIES.map(c => (
                      <option key={c.name} value={c.flag}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="flex items-center gap-2">
                    <Shirt size={14} className="text-primary" /> Shirt Size
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {SHIRT_SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setShirtSize(size)}
                        className={`py-2.5 rounded-sm font-bold text-sm border transition-all ${
                          shirtSize === size
                            ? 'bg-primary border-primary text-background'
                            : 'bg-background border-border text-foreground hover:border-primary/50'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={saveProfile.isPending} className="btn btn-primary w-full mt-4">
                  {saveProfile.isPending ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  ) : (
                    <>Continue to payment <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}

          {step === 'payment' && (
            <>
              <h1 className="h2 mb-2 text-center">Registration Fee</h1>
              <p className="text-muted-foreground text-sm text-center mb-6">
                A <span className="text-foreground font-semibold">{FEE_LABEL}</span> registration fee
                secures your spot. Choose how you'd like to pay.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPayMethod('crypto')}
                  className={`rounded-md border py-3 font-semibold flex items-center justify-center gap-2 transition ${payMethod === 'crypto' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}
                >
                  <Coins size={16} /> Crypto
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('cash')}
                  className={`rounded-md border py-3 font-semibold flex items-center justify-center gap-2 transition ${payMethod === 'cash' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-foreground/40'}`}
                >
                  <Banknote size={16} /> Cash
                </button>
              </div>

              {payMethod === 'crypto' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Send <span className="text-foreground font-semibold">{FEE_LABEL}</span> to this
                    Solana wallet:
                  </p>
                  <button
                    onClick={copyWallet}
                    className="w-full flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm break-all hover:border-primary/50"
                  >
                    <span className="truncate">{WALLET}</span>
                    <Copy size={14} className="shrink-0 text-muted-foreground" />
                  </button>
                  <div className="field">
                    <label>Solscan link to your payment</label>
                    <input
                      value={solscanUrl}
                      onChange={e => setSolscanUrl(e.target.value)}
                      placeholder="https://solscan.io/tx/…"
                    />
                  </div>
                  <button onClick={handlePay} disabled={completeOnboarding.isPending} className="btn btn-primary w-full">
                    {completeOnboarding.isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                    ) : (
                      'Submit payment'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border border-border bg-background/50 p-4 text-sm text-muted-foreground">
                    Choose cash to pay <span className="text-foreground font-semibold">{FEE_LABEL}</span>{' '}
                    in person. Your entry will be marked unpaid until an organizer collects and confirms
                    your payment at the venue.
                  </div>
                  <button onClick={handlePay} disabled={completeOnboarding.isPending} className="btn btn-primary w-full">
                    {completeOnboarding.isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> Please wait…</>
                    ) : (
                      "I'll pay cash in person"
                    )}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('info')}
                className="btn btn-ghost w-full mt-3"
              >
                Back
              </button>
            </>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <PartyPopper size={28} />
                </div>
              </div>
              <h1 className="h2 mb-3">You're registered! 🎉</h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Congratulations, {name || 'competitor'} — you're all set for Viber 5. Your custom shirt
                with your name and flag is on its way to our team.
              </p>
              <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-muted-foreground mb-6 flex items-start gap-2 text-left">
                <Users size={16} className="text-primary shrink-0 mt-0.5" />
                <span>
                  Your team and your teammate will be assigned <span className="text-foreground font-semibold">on the day of the competition</span>. Hang tight — we'll take you to your waiting area.
                </span>
              </div>
              <button onClick={() => { sessionStorage.removeItem('viber_onboarding_celebrate'); navigate('/my-team', { replace: true }); }} className="btn btn-primary w-full">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
