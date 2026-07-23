import React, { useEffect } from 'react';
import Auth from './components/Auth.tsx';
import Lobby from './components/Lobby.tsx';
import Game from './components/Game.tsx';
import Replay from './components/Replay.tsx';
import Settings from './components/Settings.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserAvatar from './components/UserAvatar.tsx';
import { Trophy, LogOut, Settings as SettingsIcon, ShieldAlert, CreditCard, Menu, X } from 'lucide-react';
import { soundService } from './services/soundService';
import { clearAppBadge } from './lib/push.ts';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore, LobbyView } from './store/useUIStore';
import { cn } from './lib/utils';

export default function App() {
  const {
    user,
    token,
    loading,
    error,
    isOnline,
    setUser,
    setIsOnline,
    login,
    logout,
    checkAuth,
  } = useAuthStore();

  const {
    currentGameId,
    replayGameId,
    showSettings,
    showAdmin,
    lobbyView,
    isMenuOpen,
    pushToast,
    swUpdateAvailable,
    appVersion,
    setCurrentGameId,
    setReplayGameId,
    setShowSettings,
    setShowAdmin,
    setLobbyView,
    setIsMenuOpen,
    setPushToast,
    setSwUpdateAvailable,
    setAppVersion,
    handleNavClick,
  } = useUIStore();

  const isAdmin = !!(user && user.is_admin === 1);

  useEffect(() => {
    clearAppBadge();
  }, []);

  // Fetch initial app version
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.app_version) {
          setAppVersion(data.app_version);
        }
      })
      .catch(console.error);
  }, [setAppVersion]);

  // Auth initialization check
  useEffect(() => {
    checkAuth();
  }, [token, checkAuth]);

  // Online status monitoring
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
            signal: controller.signal,
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
  }, [token, setIsOnline]);

  // User preferences & Service Worker Event Listeners
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

      if (user.card_scale) {
        document.documentElement.style.setProperty('--card-scale', user.card_scale.toString());
      } else {
        document.documentElement.style.setProperty('--card-scale', '1');
      }

      // Direct game link check
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
          console.error('Failed to parse navigation URL from service worker', e);
        }
      }
    };

    const handlePushNavigate = (e: any) => {
      if (e.detail) {
        const urlObj = new URL(e.detail, window.location.origin);
        const match = urlObj.pathname.match(/^\/game\/(.+)$/);
        if (match) setCurrentGameId(match[1]);
      }
    };

    const handlePushReceived = (e: any) => {
      if (e.detail && e.detail.title) {
        setPushToast({
          title: e.detail.title,
          body: e.detail.body,
          url: e.detail.data?.url || '/',
        });
        setTimeout(() => setPushToast(null), 5000);
      }
    };

    const handleSwUpdate = () => {
      setSwUpdateAvailable(true);
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    window.addEventListener('push-navigate', handlePushNavigate);
    window.addEventListener('push-received', handlePushReceived);
    window.addEventListener('sw-update', handleSwUpdate);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      window.removeEventListener('push-navigate', handlePushNavigate);
      window.removeEventListener('push-received', handlePushReceived);
      window.removeEventListener('sw-update', handleSwUpdate);
    };
  }, [user, setCurrentGameId, setPushToast, setSwUpdateAvailable]);

  const handleLogoutClick = async () => {
    await logout();
    setCurrentGameId(null);
    setReplayGameId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
        <div className="animate-pulse text-ui-yellow mb-4">LOADING...</div>
        <div className="text-xs text-ui-gray uppercase tracking-widest">Verifying Sector Integrity</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-10 text-center">
        <div className="p-8 geometric-border border-ui-red max-w-md w-full">
          <ShieldAlert className="mx-auto text-ui-red mb-6" size={48} />
          <h2 className="text-sm text-ui-red font-bold mb-4 uppercase">System Error</h2>
          <p className="text-xs text-ui-gray leading-loose mb-8 uppercase tracking-tighter">{error}</p>
          <button onClick={() => window.location.reload()} className="geometric-button text-xs w-full">
            REBOOT SYSTEM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full flex flex-col bg-bg-dark text-text-main font-press-start',
        `theme-${user?.theme || 'default'}`,
        currentGameId || replayGameId ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh] overflow-x-hidden relative'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className={cn(
          'flex flex-col flex-1 z-0',
          `ui-mode-${user?.ui_mode || 'retro'}`,
          currentGameId || replayGameId ? 'absolute inset-0 overflow-hidden' : 'relative'
        )}
      >
        {/* CRT Scanline Overlay */}
        {user?.scanlines_enabled !== 0 && (
          <div className="crt-overlay pointer-events-none fixed inset-0 z-[99999]"></div>
        )}

        {/* Header Container */}
        <div
          className={cn(
            'sticky top-0 z-[9000] bg-bg-dark/95 backdrop-blur-sm border-b border-ui-border/30 transition-all',
            currentGameId || replayGameId ? 'p-1 md:p-2' : 'p-2 md:p-4'
          )}
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.25rem)' }}
        >
          <header
            className={cn(
              'p-2 bg-ui-blue border-4 border-ui-border shadow-[4px_4px_0px_0px_#000000] flex justify-between items-center transition-all',
              currentGameId || replayGameId ? 'md:p-3 opacity-90' : 'md:p-6'
            )}
          >
            <div className="flex items-center gap-2 md:gap-4 relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  'secondary-button w-11 h-11 md:w-10 md:h-10 bg-ui-purple border-4 border-ui-red flex items-center justify-center hover:bg-ui-red transition-all cursor-pointer',
                  currentGameId || replayGameId && 'md:w-6 md:h-6'
                )}
              >
                {isMenuOpen ? (
                  <X className="text-white" size={16} />
                ) : (
                  <Menu className="text-ui-orange group-hover:text-white" size={currentGameId || replayGameId ? 12 : 16} />
                )}
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 md:w-64 bg-bg-dark border-4 border-ui-border shadow-[4px_4px_0px_0px_#000000] z-[9999] flex flex-col">
                  {(['lobby', 'online', 'history', 'stats', 'rules'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => handleNavClick(view)}
                      className={`px-4 py-4 md:py-5 text-xs md:text-sm uppercase font-bold text-left hover:bg-ui-blue/50 transition-all ${
                        lobbyView === view && !currentGameId && !replayGameId
                          ? 'text-ui-yellow bg-ui-blue/20'
                          : 'text-text-main opacity-70 hover:opacity-100'
                      }`}
                    >
                      {view === 'history' ? 'Match History' : view}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <h1
                  className={`text-sm md:text-xl tracking-tighter text-ui-yellow mb-0.5 md:mb-1 font-bold italic transition-all duration-300 ease-in-out whitespace-nowrap ${
                    currentGameId || replayGameId
                      ? 'md:text-lg hover:scale-110 hover:drop-shadow-[0_0_10px_rgba(255,205,117,0.8)] cursor-default hover:text-white'
                      : ''
                  }`}
                >
                  GOLF CARD GAME
                </h1>
                <div className="text-xs text-ui-gray uppercase tracking-widest whitespace-nowrap">
                  {appVersion} {(currentGameId || replayGameId) && ' • © 2026'}
                </div>
              </div>

              {/* Online Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 ml-2 md:ml-4 border border-ui-border bg-black/40 px-2 py-1 rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline
                      ? 'bg-ui-green shadow-[0_0_3px_rgba(50,255,100,0.8)] animate-[pulse_2s_ease-in-out_infinite]'
                      : 'bg-ui-red shadow-[0_0_3px_rgba(255,50,50,0.8)]'
                  }`}
                ></div>
                <span className={`text-[10px] md:text-xs uppercase tracking-widest ${isOnline ? 'text-ui-green' : 'text-ui-red'}`}>
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
                    <span className="text-xs text-ui-green font-bold truncate max-w-[80px]">{user.username}</span>
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
                    onClick={handleLogoutClick}
                    className="secondary-button p-2 md:p-3 bg-ui-red border-b-4 border-ui-purple text-xs hover:bg-red-600 transition-all"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            )}
          </header>
        </div>

        <AnimatePresence>
          {pushToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={() => {
                const urlObj = new URL(pushToast.url, window.location.origin);
                const match = urlObj.pathname.match(/^\/game\/(.+)$/);
                if (match) setCurrentGameId(match[1]);
                setPushToast(null);
              }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] p-4 bg-bg-dark border-2 border-ui-green text-ui-green shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-ui-green/10 transition-all flex flex-col gap-1 w-11/12 max-w-sm"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-bold">{pushToast.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPushToast(null);
                  }}
                  className="text-xs hover:opacity-70"
                >
                  ✕
                </button>
              </div>
              <span className="text-xs opacity-80">{pushToast.body}</span>
            </motion.div>
          )}

          {swUpdateAvailable && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] p-4 bg-ui-blue border-2 border-ui-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-4 w-11/12 max-w-sm"
            >
              <span className="text-xs text-white uppercase font-bold">New update available!</span>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 bg-ui-yellow text-bg-dark text-xs font-bold uppercase hover:bg-white transition-all"
              >
                Refresh
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <main
          className={`flex-1 w-full ${
            currentGameId || replayGameId ? 'max-w-7xl pb-4 overflow-y-auto' : 'max-w-5xl pb-32'
          } mx-auto p-2 md:p-8 transition-all duration-500 relative z-10`}
        >
          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <Auth onLogin={login} />
              </motion.div>
            ) : currentGameId ? (
              <motion.div
                key="game"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <Game
                  gameId={currentGameId}
                  token={token!}
                  user={user}
                  onExit={() => setCurrentGameId(null)}
                  onRematch={setCurrentGameId}
                />
              </motion.div>
            ) : replayGameId ? (
              <motion.div key="replay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <Replay
                  gameId={replayGameId}
                  token={token!}
                  user={user}
                  onExit={() => setReplayGameId(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <Lobby
                  token={token!}
                  user={user}
                  onJoinGame={setCurrentGameId}
                  onViewReplay={setReplayGameId}
                  currentView={lobbyView}
                  onViewChange={setLobbyView}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Integrated Footer to reduce scroll depth */}
          {!(currentGameId || replayGameId) && (
            <div className="mt-12 text-xs text-center text-neutral-500/40 uppercase tracking-widest">
              © 2026 GOLF CARD GAME - {appVersion}
            </div>
          )}
        </main>
      </div>

      {showSettings && user && (
        <div className="relative z-[99999]">
          <Settings user={user} token={token!} onUpdate={setUser} onClose={() => setShowSettings(false)} />
        </div>
      )}

      {showAdmin && user && isAdmin && (
        <AdminDashboard token={token!} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}
