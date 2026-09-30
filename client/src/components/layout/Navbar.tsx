import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, ChevronDown, LayoutDashboard, Globe } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `font-mono text-sm uppercase tracking-wider transition-colors ${
      isActive ? 'text-primary' : 'text-foreground hover:text-primary'
    }`;

  return (
    <nav className="sticky top-0 z-50 py-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <NavLink 
          to="/" 
          className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to home page"
        >
          <img
            src="/viber-logo.png"
            alt="Viber"
            className="h-10 w-auto object-contain"
          />
        </NavLink>
        
        {/* Mobile menu button */}
        <button 
          className="lg:hidden p-2 rounded-md hover:bg-ink-800 transition-colors"
          onClick={toggleMenu}
        >
          <Menu className="text-foreground" />
        </button>
        
        {/* Desktop menu */}
        <div className="hidden lg:flex space-x-8 items-center">
          <NavLink to="/welcome" className={navItemClass}>
            Home
          </NavLink>
          <NavLink to="/competition" className={navItemClass}>
            Competition
          </NavLink>
          <NavLink to="/workshops" className={navItemClass}>
            Workshops
          </NavLink>
          <NavLink to="/launchpad" className={navItemClass}>
            Launchpad
          </NavLink>
          {user?.isAdmin && (
            <NavLink to="/leaderboard" className={navItemClass}>
              Leaderboard
            </NavLink>
          )}
          
          {/* Auth buttons */}
          <div className="flex items-center space-x-4 pl-4 border-l border-border">
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(v => !v)}
                  className="flex items-center text-foreground hover:text-primary transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  {user?.avatarUrl || user?.discordAvatar ? (
                    <img src={(user.avatarUrl || user.discordAvatar) as string} alt="" className="h-7 w-7 rounded-full object-cover mr-2 border border-primary" />
                  ) : (
                    <User size={16} className="mr-2 text-primary" />
                  )}
                  <span className="text-sm font-bold uppercase tracking-wider">{user?.name}</span>
                  <ChevronDown size={14} className={`ml-1 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-border bg-background/95 backdrop-blur shadow-lg py-1 z-50">
                    <Link
                      to="/me"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:text-primary hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard size={14} className="text-primary" />
                      My Dashboard
                    </Link>
                    {user?.userType === 'competitor' && (user?.edition ?? 0) >= 5 && (
                      <Link
                        to={`/builders/${user?.username || user?.id}`}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:text-primary hover:bg-white/5 transition-colors"
                      >
                        <Globe size={14} className="text-primary" />
                        View my public profile
                      </Link>
                    )}
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-foreground hover:text-primary hover:bg-white/5 transition-colors"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <NavLink to="/get-started" className="btn btn-primary">
                  Get Started
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur-sm pt-20 h-screen w-screen border-t border-border">
          <div className="px-6 py-4 flex flex-col space-y-4 items-center">
            <NavLink 
              to="/welcome" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </NavLink>
            <NavLink 
              to="/competition" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              Competition
            </NavLink>
            <NavLink 
              to="/workshops" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              Workshops
            </NavLink>
            <NavLink 
              to="/launchpad" 
              className="btn btn-ghost w-full justify-center text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              Launchpad
            </NavLink>
            {isAuthenticated && (
              <NavLink 
                to="/me" 
                className="btn btn-ghost w-full justify-center text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                <User size={18} className="mr-2 text-primary" />
                My Dashboard
              </NavLink>
            )}
            {isAuthenticated && user?.userType === 'competitor' && (user?.edition ?? 0) >= 5 && (
              <NavLink 
                to={`/builders/${user?.username || user?.id}`}
                className="btn btn-ghost w-full justify-center text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                <Globe size={18} className="mr-2 text-primary" />
                My Public Profile
              </NavLink>
            )}
            {user?.isAdmin && (
              <NavLink 
                to="/leaderboard" 
                className="btn btn-ghost w-full justify-center text-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Leaderboard
              </NavLink>
            )}
            
            {/* Mobile auth buttons */}
            <div className="border-t border-border pt-6 mt-4 w-full flex flex-col items-center">
              {isAuthenticated ? (
                <div className="space-y-4 w-full flex flex-col items-center">
                  <div className="flex items-center justify-center text-foreground mb-2">
                    <User size={18} className="mr-2 text-primary" />
                    <span className="font-bold uppercase tracking-wider">{user?.teamName || user?.name}</span>
                  </div>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="btn btn-ghost w-full justify-center text-lg"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <NavLink 
                    to="/get-started" 
                    className="btn btn-primary w-full justify-center text-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </NavLink>
                </div>
              )}
            </div>
            
            <button 
              className="mt-8 btn w-full justify-center text-ink-400 hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Close Menu
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
