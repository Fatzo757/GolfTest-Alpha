import React, { useState, useEffect, useCallback } from 'react';
import { User, GameState } from './types.ts';
import Auth from './components/Auth.tsx';
import Lobby from './components/Lobby.tsx';
import Game from './components/Game.tsx';
import Replay from './components/Replay.tsx';
import Settings from './components/Settings.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserAvatar from './components/UserAvatar.tsx';
import { Trophy, LogOut, Settings as SettingsIcon, ShieldAlert, CreditCard } from 'lucide-react';
import { soundService } from './services/soundService';

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

  const isAdmin = user && (user.username === 'fatzo757@gmail.com' || user.username === 'admin' || user.username === 'system');

  useEffect(() => {
    if (user) {
      soundService.setMuted(!!user.mute_sounds);
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    if (token) {
      setLoading(true);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      })
      .then(async res => {
        if (!res.ok) {
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
        setToken(null);
        setUser(null);
        try {
          localStorage.removeItem('golf_token');
        } catch (e) {}
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
    <div className={`min-h-screen bg-bg-dark text-text-main font-press-start ${user?.theme === 'retro' ? 'brightness-90 contrast-110 saturate-50' : user?.theme === 'slate' ? 'hue-rotate-180' : user?.theme === 'voltage' ? 'brightness-110 contrast-125' : ''}`}>
      {/* Header Container */}
      {!currentGameId && !replayGameId && (
        <div className="sticky top-0 z-[100] p-2 md:p-4 bg-bg-dark/80 backdrop-blur-md">
          <header className="p-3 md:p-6 bg-ui-blue border-4 border-ui-border shadow-[4px_4px_0px_0px_#000000] flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-ui-purple border-4 border-ui-red flex items-center justify-center">
                <CreditCard className="text-ui-orange" size={16} />
              </div>
              <div>
                <h1 className="text-[8px] md:text-sm tracking-tighter text-ui-yellow mb-0.5 md:mb-1 font-bold italic">GOLF</h1>
                <div className="text-[6px] md:text-[8px] text-ui-gray uppercase tracking-widest">V0.1-Alpha</div>
              </div>
            </div>
            
            {user && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-4 hover:opacity-80 transition-all p-2 bg-black/40 border-2 border-ui-border rounded-sm group cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  <div className="w-8 h-8 bg-black/60 border-2 border-ui-green flex items-center justify-center group-hover:bg-ui-green group-hover:text-black transition-all">
                    <UserAvatar type={user.avatar} size={16} />
                  </div>
                  <div className="hidden md:flex flex-col items-start text-left bg-black/20 px-2 py-1 rounded">
                    <span className="text-[6px] text-ui-gray uppercase tracking-widest leading-none mb-1">Authenticated As</span>
                    <span className="text-[10px] text-ui-green font-bold truncate max-w-[120px]">{user.username}</span>
                  </div>
                </button>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button 
                      onClick={() => setShowAdmin(true)}
                      className="p-3 bg-red-900 border-b-4 border-ui-red text-xs hover:bg-opacity-80 transition-all flex items-center gap-2"
                      title="Admin Dashboard"
                    >
                      <ShieldAlert size={18} className="text-white" />
                      <span className="hidden lg:inline text-white text-[8px] uppercase font-bold tracking-tighter">Admin</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="p-3 bg-ui-blue border-b-4 border-ui-yellow text-xs hover:bg-opacity-80 transition-all"
                    title="Settings"
                  >
                    <SettingsIcon size={18} className="text-ui-yellow" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-3 bg-ui-red border-b-4 border-ui-purple text-xs hover:bg-red-600 transition-all"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            )}
          </header>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : currentGameId ? (
          <Game 
            gameId={currentGameId} 
            token={token!} 
            user={user} 
            onExit={() => setCurrentGameId(null)} 
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
          />
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

      {/* Retro Footer */}
      <footer className="p-4 text-[10px] text-center text-neutral-500">
        © 2026 GOLF CARD GAME - V0.1-Alpha
      </footer>
    </div>
  );
}
