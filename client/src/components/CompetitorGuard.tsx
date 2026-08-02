import { useEffect, useState } from 'react';
import { Navigate, useLocation, matchPath } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthProvider';
import { teamNameToSlug } from '@/lib/teamUtils';
import ClearanceLoader from './ClearanceLoader';

interface CompetitorGuardProps {
  children: React.ReactNode;
}

interface MyTeamUser {
  teamName?: string;
  userType: string;
  onboarded?: boolean;
}

// Routes everyone (including not-yet-onboarded competitors) may always view.
const PUBLIC_PATHS = ['/dashboard', '/roster', '/winners', '/me', '/games', '/leaderboard'];
// Path prefixes everyone may always view (e.g. event detail pages).
const PUBLIC_PREFIXES = ['/events', '/competition', '/competitors', '/v5', '/winners'];

const CompetitorGuard = ({ children }: CompetitorGuardProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();

  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 1700);
    return () => clearTimeout(t);
  }, []);

  const isPublic =
    PUBLIC_PATHS.includes(location.pathname) ||
    PUBLIC_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  const isCompetitor = !!user && user.userType === 'competitor' && !user.isAdmin;

  // NOTE: every hook (incl. this query) must run on every render, before any
  // early return, or the hook count changes when navigating between public and
  // non-public routes and React crashes the whole app to a blank/black screen.
  const { data: myTeamUser, isLoading: teamLoading } = useQuery<MyTeamUser>({
    queryKey: ['/api/my-team'],
    refetchInterval: 15000,
    enabled: isCompetitor && !isPublic,
  });

  if (isPublic) {
    return <>{children}</>;
  }

  if (authLoading || !minElapsed || (isCompetitor && teamLoading)) {
    return <ClearanceLoader />;
  }

  if (isCompetitor) {
    const path = location.pathname;

    // Competitors must complete onboarding before anything else
    if (!myTeamUser?.onboarded) {
      if (path === '/onboarding') return <>{children}</>;
      return <Navigate to="/onboarding" replace />;
    }

    // Already onboarded — don't let them sit on the onboarding page,
    // except right after finishing, so the congrats screen can be shown.
    if (path === '/onboarding') {
      const celebrating =
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('viber_onboarding_celebrate') === '1';
      if (celebrating) return <>{children}</>;
      return <Navigate to="/my-team" replace />;
    }

    if (path === '/my-team') {
      return <>{children}</>;
    }

    if (myTeamUser?.teamName) {
      const ownSlug = teamNameToSlug(myTeamUser.teamName);
      const isOwnTeamPage =
        !!matchPath('/team/:slug', path) && path === `/team/${ownSlug}`;
      const isOwnTeamSettings =
        !!matchPath('/team/:slug/settings', path) &&
        path === `/team/${ownSlug}/settings`;

      const isOwnTeamEdit =
        !!matchPath('/team/:slug/edit/:gameId', path) &&
        path.startsWith(`/team/${ownSlug}/edit/`);

      if (isOwnTeamPage || isOwnTeamSettings || isOwnTeamEdit) {
        return <>{children}</>;
      }
    }

    return <Navigate to="/my-team" replace />;
  }

  return <>{children}</>;
};

export default CompetitorGuard;