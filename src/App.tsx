import React, { useState, useEffect, useCallback } from 'react';
import { User, GameState } from './types.ts';
import Auth from './components/Auth.tsx';
import Lobby from './components/Lobby.tsx';
import Game from './components/Game.tsx';
import Replay from './components/Replay.tsx';
import Settings from './components/Settings.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserAvatar from './components/UserAvatar.tsx';
import { Trophy, LogOut, Settings as SettingsIcon, ShieldAlert, CreditCard, Menu, X } from 'lucide-react';
import { soundService } from './services/soundService';

const getThemeClasses = (themeId?: string) => {
  return `theme-${themeId || 'default'}`;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('golf_token');
    } catch (e) {
      console.warn('LocalStorage access failed:', e);
      return null;
    }
  });

  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [replayGameId, setReplayGameId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [appVersion, setAppVersion] = useState<string>('V0.1-Alpha');

  const [lobbyView, setLobbyView] = useState<'lobby' | 'online' | 'history' | 'rules' | 'stats'>('lobby');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = user && (user.is_admin === 1 || user.username === 'fatzo757@gmail.com' || user.username === 'admin' || user.username === 'system');

  const handleNavClick = (view: 'lobby' | 'online' | 'history' | 'rules' | 'stats') => {
    setLobbyView(view);
    setCurrentGameId(null);
    setReplayGameId(null);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data && data.app_version) {
          setAppVersion(data.app_version);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(async () => {
      if (navigator.onLine) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/me`, {
            method: 'HEAD',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          setIsOnline(res.ok || res.status === 401);
        } catch (e) {
          setIsOnline(false);
        }
      } else {
        setIsOnline(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (user) {
      soundService.setMuted(!!user.mute_sounds);
      soundService.setVolume(user.sound_volume ?? 1.0);
      soundService.setProfile(user.sound_profile || 'classic');
      
      if (user.ui_scale) {
        document.documentElement.style.fontSize = `${user.ui_scale * 100}%`;
      } else {
        document.documentElement.style.fontSize = '100%';
      }

      // Check URL pathname for direct game link on load
      const match = window.location.pathname.match(/^\/game\/(.+)$/);
      if (match) {
        setCurrentGameId(match[1]);
        window.history.replaceState({}, document.title, '/');
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE_TO_GAME' && user) {
        try {
          const urlObj = new URL(event.data.url, window.location.origin);
          const match = urlObj.pathname.match(/^\/game\/(.+)$/);
          if (match) {
             setCurrentGameId(match[1]);
          }
        } catch (e) {
          console.error("Failed to parse navigation URL from service worker", e);
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    if (token) {
      setLoading(true);
      fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      })
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('UNAUTHORIZED');
          }
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          throw new Error('Invalid user data');
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Auth check failed:', err);
        setError(`Authentication service unavailable: ${err.message}`);
        
        if (err.message === 'UNAUTHORIZED') {
          setToken(null);
          setUser(null);
          try {
            localStorage.removeItem('golf_token');
          } catch (e) {}
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [token]);

  const handleLogin = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('golf_token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('golf_token');
    } catch (e) {}
    setCurrentGameId(null);
    setReplayGameId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
        <div className="animate-pulse text-ui-yellow mb-4">LOADING...</div>
        <div className="text-[8px] text-ui-gray uppercase tracking-widest">Verifying Sector Integrity</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-10 text-center">
        <div className="p-8 geometric-border border-ui-red max-w-md w-full">
           <ShieldAlert className="mx-auto text-ui-red mb-6" size={48} />
           <h2 className="text-sm text-ui-red font-bold mb-4 uppercase">System Error</h2>
           <p className="text-[8px] text-ui-gray leading-loose mb-8 uppercase tracking-tighter">{error}</p>
           <button 
             onClick={() => window.location.reload()}
             className="geometric-button text-[10px] w-full"
           >
             REBOOT SYSTEM
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex flex-col bg-bg-dark text-text-main font-press-start theme-${user?.theme || 'default'} ui-mode-${user?.ui_mode || 'retro'}`}>
      {/* Header Container */}
      <div
        className={`sticky top-0 z-[9000] bg-bg-dark/95 backdrop-blur-sm border-b border-ui-border/30 transition-all ${currentGameId || replayGameId ? 'p-1 md:p-2' : 'p-2 md:p-4'}`}
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 0.25rem)' }}
      >
        <header className={`p-2 bg-ui-blue border-4 border-ui-border shadow-[4px_4px_0px_0px_#000000] flex justify-between items-center transition-all ${currentGameId || replayGameId ? 'md:p-3 opacity-90' : 'md:p-6'}`}>
          <div className="flex items-center gap-2 md:gap-4 relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`secondary-button w-8 h-8 md:w-10 md:h-10 bg-ui-purple border-4 border-ui-red flex items-center justify-center hover:bg-ui-red transition-all cursor-pointer ${currentGameId || replayGameId ? 'md:w-6 md:h-6' : ''}`}
            >
              {isMenuOpen ? <X className="text-white" size={16} /> : <Menu className="text-ui-orange group-hover:text-white" size={currentGameId || replayGameId ? 12 : 16} />}
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 md:w-64 bg-bg-dark border-4 border-ui-border shadow-[4px_4px_0px_0px_#000000] z-[9999] flex flex-col">
                {(['lobby', 'online', 'history', 'stats', 'rules'] as const).map(view => (
                  <button
                    key={view}
                    onClick={() => handleNavClick(view)}
                    className={`px-4 py-4 md:py-5 text-xs md:text-sm uppercase font-bold text-left hover:bg-ui-blue/50 transition-all ${lobbyView === view && !currentGameId && !replayGameId ? 'text-ui-yellow bg-ui-blue/20' : 'text-text-main opacity-70 hover:opacity-100'}`}
                  >
                    {view === 'history' ? 'Match History' : view}
                  </button>
                ))}
              </div>
            )}
            
            <div>
              <h1 className={`text-sm md:text-xl tracking-tighter text-ui-yellow mb-0.5 md:mb-1 font-bold italic transition-all duration-300 ease-in-out whitespace-nowrap ${currentGameId || replayGameId ? 'md:text-lg hover:scale-110 hover:drop-shadow-[0_0_10px_rgba(255,205,117,0.8)] cursor-default hover:text-white' : ''}`}>GOLF CARD GAME</h1>
              <div className="text-[8px] md:text-[10px] text-ui-gray uppercase tracking-widest whitespace-nowrap">
                {appVersion} {(currentGameId || replayGameId) && ' • © 2026'}
              </div>
            </div>
            {/* Online Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2 md:ml-4 border border-ui-border bg-black/40 px-2 py-1 rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-ui-green shadow-[0_0_3px_rgba(50,255,100,0.8)] animate-[pulse_2s_ease-in-out_infinite]' : 'bg-ui-red shadow-[0_0_3px_rgba(255,50,50,0.8)]'}`}></div>
              <span className={`text-[6px] md:text-[8px] uppercase tracking-widest ${isOnline ? 'text-ui-green' : 'text-ui-red'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setShowSettings(true)}
                className="secondary-button flex items-center gap-2 md:gap-4 hover:opacity-80 transition-all p-1 md:p-2 bg-black/40 border-2 border-ui-border rounded-sm group cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
              >
                <div className="w-6 h-6 md:w-8 md:h-8 bg-black/60 border-2 border-ui-green flex items-center justify-center group-hover:bg-ui-green group-hover:text-black transition-all">
                  <UserAvatar type={user.avatar} size={14} />
                </div>
                <div className="hidden md:flex flex-col items-start text-left bg-black/20 px-2 py-1 rounded">
                  <span className="text-[10px] text-ui-green font-bold truncate max-w-[80px]">{user.username}</span>
                </div>
              </button>
              
              <div className="flex gap-1 md:gap-2">
                {isAdmin && (
                  <button 
                    onClick={() => setShowAdmin(true)}
                    className="secondary-button p-2 md:p-3 bg-red-900 border-b-4 border-ui-red text-xs hover:bg-opacity-80 transition-all flex items-center gap-2"
                  >
                    <ShieldAlert size={16} className="text-white" />
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="secondary-button p-2 md:p-3 bg-ui-red border-b-4 border-ui-purple text-xs hover:bg-red-600 transition-all"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}
        </header>
      </div>

      <main className={`flex-1 overflow-y-auto w-full ${currentGameId || replayGameId ? 'max-w-7xl pb-4' : 'max-w-5xl pb-32'} mx-auto p-2 md:p-8 transition-all duration-500`}>
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : currentGameId ? (
          <Game 
            gameId={currentGameId} 
            token={token!} 
            user={user} 
            onExit={() => setCurrentGameId(null)} 
            onRematch={setCurrentGameId}
          />
        ) : replayGameId ? (
          <Replay 
            gameId={replayGameId} 
            token={token!} 
            user={user}
            onExit={() => setReplayGameId(null)} 
          />
        ) : (
          <Lobby 
            token={token!} 
            user={user}
            onJoinGame={setCurrentGameId} 
            onViewReplay={setReplayGameId}
            currentView={lobbyView}
            onViewChange={setLobbyView}
          />
        )}

        {/* Integrated Footer to reduce scroll depth */}
        {!(currentGameId || replayGameId) && (
          <div className="mt-12 text-[10px] text-center text-neutral-500/40 uppercase tracking-widest">
            © 2026 GOLF CARD GAME - {appVersion}
          </div>
        )}
      </main>

      {showSettings && user && (
        <Settings 
          user={user} 
          token={token!} 
          onUpdate={setUser} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {showAdmin && user && isAdmin && (
        <AdminDashboard 
          token={token!} 
          onClose={() => setShowAdmin(false)} 
        />
      )}
    </div>
  );
}
