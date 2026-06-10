import React, { useState, useEffect } from 'react';
import { User, GameState } from '../types.ts';
import { Users, Monitor, Play, Hash, History, Award, Trash2, Settings, Eye, Trophy, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import UserAvatar from './UserAvatar.tsx';
import { formatMatchTime } from '../lib/timeUtils';
import { registerServiceWorker, subscribeUserToPush } from '../lib/push.ts';

interface LobbyProps {
  token: string;
  user: User;
  onJoinGame: (gameId: string) => void;
  onViewReplay: (gameId: string) => void;
}

export default function Lobby({ token, user, onJoinGame, onViewReplay }: LobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0, ratio: "0", total: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [joinableGames, setJoinableGames] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);
  const [view, setView] = useState<'lobby' | 'online' | 'history' | 'rules'>('lobby');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAction, setConfirmClearAction] = useState<'all' | 'old' | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    registerServiceWorker().then(() => {
      subscribeUserToPush(token);
    });
    
    fetchStats();
    fetchHistory();
    fetchOnlineUsers();
    fetchActiveMatches();
    fetchJoinableGames();
    
    // Polling for updates
    const timer = setInterval(() => {
      fetchHistory();
      fetchOnlineUsers();
      fetchActiveMatches();
      fetchJoinableGames();
    }, 8000);

    return () => clearInterval(timer);
  }, [token]);

  const fetchActiveMatches = async () => {
    try {
      const res = await fetch('/api/games/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveMatches(data.games || []);
      }
    } catch (err) { console.error(err); }
  };

  const abandonGame = async (gameId: string) => {
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchActiveMatches();
        setConfirmDeleteId(null);
      }
    } catch (err) { console.error(err); }
  };

  const remindOpponent = async (gameId: string) => {
    try {
      const res = await fetch(`/api/games/${gameId}/remind`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Nudge sent successfully!' });
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        const data = await res.json();
        setStatusMsg({ type: 'error', text: data.error || 'Failed to send nudge' });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) { 
      console.error(err); 
      setStatusMsg({ type: 'error', text: 'Connection error while sending nudge' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const fetchJoinableGames = async () => {
    try {
      const res = await fetch('/api/games/joinable', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJoinableGames(data.games || []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch('/api/users/online', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data.users || []);
      }
    } catch (err) { console.error(err); }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (err) { console.error(err); }
  };

  const inviteUser = async (targetId: string) => {
    setInviteLoading(targetId);
    try {
      const res = await fetch('/api/games/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: targetId })
      });
      if (res.ok) {
        const data = await res.json();
        onJoinGame(data.gameId);
      }
    } catch (err) { console.error(err); }
    finally { setInviteLoading(null); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/users/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/games/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setHistory(data.history);
    } catch (err) { console.error(err); }
  };

  const deleteMatch = async (gameId: string) => {
    try {
      const res = await fetch(`/api/games/${gameId}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(prev => prev.filter(g => g.id !== gameId));
      }
    } catch (err) { console.error(err); }
  };

  const clearHistory = async (filter: 'all' | 'old' = 'all') => {
    setConfirmClearAction(filter);
  };

  const executeClearHistory = async () => {
    if (!confirmClearAction) return;
    const filter = confirmClearAction;
    
    setLoading(true);
    try {
      const res = await fetch('/api/games/history/clear', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filter })
      });
      if (res.ok) {
        if (filter === 'all') {
          setHistory([]);
        } else {
          fetchHistory();
        }
        setConfirmClearAction(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to clear history');
        setConfirmClearAction(null);
      }
    } catch (err) { 
      console.error(err); 
      setError('Connection error while clearing history');
      setConfirmClearAction(null);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async (isVsCpu: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/games/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isVsCpu, difficulty: isVsCpu ? difficulty : undefined })
      });
      const data = await res.json();
      if (res.ok) {
        onJoinGame(data.gameId);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/join/${roomCode}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        onJoinGame(data.gameId);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const activeMatchesSection = activeMatches.length > 0 && (
    <motion.div 
      className="md:col-span-2 p-8 geometric-border space-y-6 bg-ui-green/5 relative mt-8"
    >
      <div className="flex items-center gap-3 border-b-2 border-ui-border pb-4">
        <Play className="text-ui-green" size={20} />
        <h3 className="text-[10px] text-ui-green tracking-widest uppercase font-bold">Resumable Sessions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeMatches.map((game) => (
          <motion.div 
            key={game.id}
            whileHover={{ scale: 1.01 }}
            className="p-4 border-2 border-ui-green bg-bg-dark flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 h-full"
          >
            <div className="flex flex-col gap-2">
              <div className="text-[9px] uppercase font-bold flex items-center gap-2">
                <span className="text-ui-gray">VS</span>
                <div className="flex items-center gap-2">
                  <span className="text-ui-green">
                    {game.player1_id === user.id ? (game.player2_name || (game.is_vs_cpu ? 'CPU' : 'WAITING ROOM')) : (game.player1_name || 'OPPONENT')}
                  </span>
                  {game.is_vs_cpu && (
                    <span className={`px-1 py-0.5 text-[6px] font-black uppercase tracking-widest border ${
                      game.cpu_difficulty === 'hard' ? 'bg-ui-red/20 text-ui-red border-ui-red/30' :
                      game.cpu_difficulty === 'normal' ? 'bg-ui-yellow/20 text-ui-yellow border-ui-yellow/30' :
                      'bg-ui-green/20 text-ui-green border-ui-green/30'
                    }`}>
                      {game.cpu_difficulty || 'normal'}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[7px] flex items-center gap-2 uppercase">
                  <span className={`px-1 py-0.5 font-bold ${
                    game.status === 'playing' ? 'bg-ui-green/20 text-ui-green' : 
                    game.status === 'initializing' ? 'bg-ui-yellow/20 text-ui-yellow animate-pulse' :
                    'bg-ui-purple/20 text-ui-purple'
                  }`}>
                    {game.status.replace('_', ' ')}
                  </span>
                  {game.status === 'playing' && (
                    <span className={`font-bold ${game.current_turn_player_id === user.id ? 'text-ui-yellow animate-pulse' : 'text-ui-red'}`}>
                      • {game.current_turn_player_id === user.id ? 'YOUR TURN' : "OPPONENT'S TURN"}
                    </span>
                  )}
              </div>
              <div className="text-[7px] text-ui-gray uppercase flex font-mono bg-transparent">
                  ID: {game.id.substring(0, 8)}... • Started {formatMatchTime(game.created_at, { timeZone: user.time_zone, timeFormat: user.time_format, showDate: !!user.show_date })}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2 w-full xl:w-auto mt-2 xl:mt-0">
              <AnimatePresence mode="wait">
                {confirmDeleteId === game.id ? (
                  <motion.div 
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={() => abandonGame(game.id)}
                      className="px-3 py-2 bg-ui-red text-white text-[8px] font-black uppercase hover:bg-white hover:text-ui-red transition-all"
                    >
                      CONFIRM DELETE
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-2 border-2 border-ui-border text-ui-gray hover:text-white transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={() => setConfirmDeleteId(game.id)}
                      className="p-2 border-2 border-ui-border text-ui-gray hover:text-ui-red hover:border-ui-red transition-all"
                      title="Abandon Match"
                    >
                      <Trash2 size={14} />
                    </button>
                    {game.status === 'playing' && game.current_turn_player_id !== user.id && !game.is_vs_cpu && (
                      <button
                        onClick={() => remindOpponent(game.id)}
                        className="px-4 py-2 border-2 border-ui-purple text-ui-purple text-[10px] font-black hover:bg-ui-purple hover:text-white transition-all whitespace-nowrap"
                        title="Send Nudge"
                      >
                        NUDGE
                      </button>
                    )}
                    <button
                      onClick={() => onJoinGame(game.id)}
                      className="px-4 py-2 bg-ui-green text-bg-dark text-[10px] font-black hover:bg-white transition-all whitespace-nowrap"
                    >
                      {game.status === 'playing' ? 'RESUME' : 'VIEW'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <AnimatePresence>
        {statusMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] p-4 border-2 flex gap-4 justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${statusMsg.type === 'success' ? 'bg-bg-dark border-ui-green text-ui-green' : 'bg-bg-dark border-ui-red text-ui-red'}`}
          >
            <span className="text-[10px] uppercase font-bold">{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="text-[10px] hover:opacity-70 transition-opacity">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="geometric-border p-4 bg-ui-blue/5">
          <div className="text-[8px] text-ui-gray uppercase mb-1">Total Games</div>
          <div className="text-xl font-bold text-ui-yellow">{stats.total}</div>
        </div>
        <div className="geometric-border p-4 bg-ui-green/5">
          <div className="text-[8px] text-ui-gray uppercase mb-1">Wins</div>
          <div className="text-xl font-bold text-ui-green">{stats.wins}</div>
        </div>
        <div className="geometric-border p-4 bg-ui-red/5">
          <div className="text-[8px] text-ui-gray uppercase mb-1">Losses</div>
          <div className="text-xl font-bold text-ui-red">{stats.losses}</div>
        </div>
        <div className="geometric-border p-4 bg-ui-purple/5">
          <div className="text-[8px] text-ui-gray uppercase mb-1">Win Ratio</div>
          <div className="text-xl font-bold text-ui-purple">{stats.ratio}%</div>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <button 
          onClick={() => setView('lobby')}
          className={`px-6 py-2 text-[10px] uppercase font-bold border-b-4 transition-all ${view === 'lobby' ? 'border-ui-yellow text-ui-yellow' : 'border-transparent text-ui-gray opacity-50 hover:opacity-100'}`}
        >
          Lobby
        </button>
        <button 
          onClick={() => setView('online')}
          className={`px-6 py-2 text-[10px] uppercase font-bold border-b-4 transition-all ${view === 'online' ? 'border-ui-yellow text-ui-yellow' : 'border-transparent text-ui-gray opacity-50 hover:opacity-100'}`}
        >
          Online
        </button>
        <button 
          onClick={() => setView('history')}
          className={`px-6 py-2 text-[10px] uppercase font-bold border-b-4 transition-all ${view === 'history' ? 'border-ui-yellow text-ui-yellow' : 'border-transparent text-ui-gray opacity-50 hover:opacity-100'}`}
        >
          Match History
        </button>
        <button 
          onClick={() => setView('rules')}
          className={`px-6 py-2 text-[10px] uppercase font-bold border-b-4 transition-all ${view === 'rules' ? 'border-ui-yellow text-ui-yellow' : 'border-transparent text-ui-gray opacity-50 hover:opacity-100'}`}
        >
          Rules
        </button>
      </div>

      {activeMatches.length > 0 && activeMatchesSection}

      <AnimatePresence mode="wait">
        {confirmClearAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 md:relative md:inset-auto md:z-0 md:bg-transparent md:mb-8"
          >
            <div className="bg-bg-dark border-4 border-ui-red p-8 shadow-[8px_8px_0px_0px_#cc3333] max-w-md w-full">
              <h3 className="text-[10px] text-ui-red font-bold uppercase mb-4 tracking-widest">Confirm Clear Action</h3>
              <p className="text-[8px] text-ui-gray uppercase mb-8 leading-relaxed">
                {confirmClearAction === 'all' 
                  ? 'Are you sure you want to clear your ENTIRE game history? statistics will not be affected.'
                  : 'Are you sure you want to clear matches older than 30 days?'}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={executeClearHistory}
                  disabled={loading}
                  className="flex-1 bg-ui-red text-white py-4 text-[10px] font-bold uppercase cursor-pointer transition-all hover:opacity-80 disabled:opacity-50"
                >
                  {loading ? 'Clearing...' : 'Clear Data'}
                </button>
                <button
                  onClick={() => setConfirmClearAction(null)}
                  disabled={loading}
                  className="flex-1 border-4 border-ui-border text-ui-gray py-4 text-[10px] font-bold uppercase cursor-pointer hover:text-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'lobby' ? (
          <motion.div 
            key="lobby"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Create Game Section */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 geometric-border space-y-8 bg-ui-blue/5 md:col-span-2"
            >
              <div className="flex items-center gap-3 border-b-2 border-ui-border pb-4">
                <Play className="text-ui-yellow" size={20} />
                <h3 className="text-[10px] text-ui-yellow tracking-widest uppercase font-bold">Start a New Game</h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col gap-3">
                  <span className="text-[8px] text-ui-gray uppercase tracking-widest px-1">AI Difficulty</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['easy', 'normal', 'hard'] as const).map((d) => (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDifficulty(d)}
                        className={`py-2 text-[8px] uppercase border-2 transition-all font-bold ${
                          difficulty === d 
                            ? 'border-black bg-ui-orange text-bg-dark shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
                            : 'border-ui-border text-ui-gray opacity-50 hover:opacity-100'
                        }`}
                      >
                        {d}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => createGame(true)}
                  disabled={loading}
                  className="w-full geometric-button py-4 text-xs flex items-center justify-center gap-3"
                >
                   <Monitor size={16} />
                   <span>Play Local (VS CPU)</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('online')}
                  disabled={loading}
                  className="w-full geometric-button py-4 text-xs border-ui-green flex items-center justify-center gap-3"
                >
                   <Users size={16} />
                   <span>Online</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        ) : view === 'online' ? (
          <motion.div 
            key="online"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Join Game Section */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="h-full p-8 geometric-border space-y-8 bg-ui-green/5"
            >
              <div className="flex items-center gap-3 border-b-2 border-ui-border pb-4">
                <Hash className="text-ui-green" size={20} />
                <h3 className="text-[10px] text-ui-green tracking-widest uppercase font-bold">Join Game Room</h3>
              </div>

              <form onSubmit={joinGame} className="space-y-6">
                <div className="bg-bg-dark p-6 border-2 border-ui-border shadow-inner">
                  <label className="block text-[8px] text-ui-gray mb-4 uppercase tracking-widest text-center">Input 6-Digit Room Code</label>
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    className="w-full bg-transparent border-b-4 border-ui-yellow pb-4 text-3xl font-bold tracking-[0.5em] text-ui-yellow focus:outline-none placeholder:opacity-10 text-center"
                    maxLength={6}
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || !roomCode}
                  className="w-full geometric-button py-4 text-xs flex items-center justify-center gap-3"
                >
                   <span>Join Now</span>
                </motion.button>
              </form>
            </motion.div>

            {/* Host Online Game Section */}
            <motion.div 
               whileHover={{ y: -5 }}
               className="h-full p-8 geometric-border space-y-8 bg-ui-orange/5"
            >
               <div className="flex items-center gap-3 border-b-2 border-ui-border pb-4">
                 <Users className="text-ui-orange" size={20} />
                 <h3 className="text-[10px] text-ui-orange tracking-widest uppercase font-bold">Host Online Room</h3>
               </div>
               <div className="space-y-6 h-full flex flex-col justify-center pb-8">
                 <p className="text-[10px] text-ui-gray uppercase leading-relaxed">
                   Create a private room to invite friends using a 6-digit code.
                 </p>
                 <motion.button
                   whileTap={{ scale: 0.98 }}
                   onClick={() => createGame(false)}
                   disabled={loading}
                   className="w-full geometric-button py-4 text-xs border-ui-orange flex items-center justify-center gap-3"
                 >
                    <Users size={16} />
                    <span>Create Room</span>
                 </motion.button>
               </div>
            </motion.div>

            {/* Public Games Section */}
            {joinableGames.length > 0 && (
              <motion.div 
                className="md:col-span-2 p-8 geometric-border space-y-6 bg-ui-yellow/5"
              >
                <div className="flex items-center justify-between border-b-2 border-ui-border pb-4">
                  <div className="flex items-center gap-3">
                    <History className="text-ui-yellow" size={20} />
                    <h3 className="text-[10px] text-ui-yellow tracking-widest uppercase font-bold">Public Matchrooms</h3>
                  </div>
                  <span className="text-[7px] text-ui-gray uppercase font-bold">{joinableGames.length} waiting for players</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {joinableGames.map((game) => (
                    <motion.div 
                      key={game.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 border-2 border-ui-yellow bg-bg-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-full group"
                    >
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 border border-ui-yellow/30 bg-ui-yellow/5 flex items-center justify-center">
                            <UserAvatar type={game.host_avatar} size={20} />
                         </div>
                         <div>
                            <div className="text-[9px] font-bold text-ui-yellow uppercase leading-none mb-1">
                               {game.host_name}'s Room
                            </div>
                            <div className="text-[7px] text-ui-gray uppercase">
                               CODE: <span className="text-white">{game.room_code}</span>
                            </div>
                         </div>
                      </div>
                      <button
                        onClick={() => onJoinGame(game.id)}
                        className="px-4 py-2 border-2 border-ui-yellow text-[8px] font-black hover:bg-ui-yellow hover:text-bg-dark transition-all mt-4 sm:mt-0 w-full sm:w-auto"
                      >
                        JOIN
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Online & Search Section */}
            <motion.div 
              className="md:col-span-2 p-8 geometric-border space-y-6 bg-ui-purple/5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-ui-border pb-4">
                <div className="flex items-center gap-3">
                  <Users className="text-ui-purple" size={20} />
                  <h3 className="text-[10px] text-ui-purple tracking-widest uppercase font-bold">Invite Players</h3>
                </div>
                
                <div className="relative flex-1 max-w-md">
                   <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                     <Search size={14} className="text-ui-gray" />
                   </div>
                   <input 
                     type="text"
                     value={searchQuery}
                     onChange={(e) => handleSearch(e.target.value)}
                     placeholder="SEARCH BY USERNAME..."
                     className="w-full bg-bg-dark border-2 border-ui-border py-2 pl-10 pr-4 text-[8px] uppercase font-bold text-ui-purple focus:border-ui-purple outline-none transition-all placeholder:opacity-30"
                   />
                </div>

                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${onlineUsers.length > 0 ? 'bg-ui-green animate-pulse' : 'bg-ui-gray'}`} />
                   <span className="text-[7px] text-ui-gray uppercase font-bold">{onlineUsers.length} online</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {searchQuery.length >= 2 ? (
                  searchResults.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-[10px] uppercase text-ui-gray opacity-40 italic tracking-widest">
                      No users found matching "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((u) => (
                      <PlayerCard 
                        key={u.id} 
                        u={u} 
                        onInvite={inviteUser} 
                        isLoading={inviteLoading === u.id} 
                      />
                    ))
                  )
                ) : onlineUsers.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-[10px] uppercase text-ui-gray opacity-40 italic tracking-widest">
                    No other players currently online. Use search to find friends.
                  </div>
                ) : (
                  onlineUsers.map((u) => (
                    <PlayerCard 
                      key={u.id} 
                      u={u} 
                      onInvite={inviteUser} 
                      isLoading={inviteLoading === u.id} 
                    />
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : view === 'history' ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center bg-bg-dark p-4 border-l-4 border-ui-yellow gap-4 overflow-x-auto">
              <h3 className="text-[10px] text-ui-yellow uppercase font-bold whitespace-nowrap">Recent Matches</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => clearHistory('old')}
                  className="flex items-center gap-2 text-[8px] text-ui-gray hover:text-white transition-all uppercase whitespace-nowrap"
                >
                  <Trash2 size={12} />
                  <span>Clear &gt;30d</span>
                </button>
                <button 
                  onClick={() => clearHistory('all')}
                  className="flex items-center gap-2 text-[8px] text-ui-red hover:opacity-80 transition-all uppercase whitespace-nowrap"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="p-12 geometric-border text-center text-ui-gray opacity-40 text-[10px]">
                NO MATCHES FOUND IN MEMORY
              </div>
            ) : (
              <div className="grid gap-4">
                {history.map((game) => (
                  <motion.div 
                    key={game.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-6 geometric-border bg-ui-blue/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 h-full group"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`p-3 border-2 ${game.winner_player_id === 'cpu' || game.winner_player_id ? 'border-ui-green text-ui-green' : 'border-ui-red text-ui-red'}`}>
                        <Trophy size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold mb-1 flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 flex items-center justify-center opacity-70">
                               <UserAvatar type={game.player1_avatar} size={12} />
                            </div>
                            <span className={game.player1_id === game.winner_player_id ? 'text-ui-green' : ''}>{game.player1_name}</span>
                          </div>
                          <span className="mx-2 opacity-30 text-[8px]">VS</span>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 flex items-center justify-center opacity-70">
                               <UserAvatar type={game.player2_avatar} size={12} />
                            </div>
                            <span className={game.player2_id === game.winner_player_id ? 'text-ui-green' : ''}>{game.player2_name}</span>
                          </div>
                        </div>
                        <div className="text-[8px] text-ui-gray uppercase letter-spacing-widest">
                          {game.player1_total_score} - {game.player2_total_score} • {formatMatchTime(game.updated_at, { timeZone: user.time_zone, timeFormat: user.time_format, showDate: !!user.show_date })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 mt-4 md:mt-0 w-full md:w-auto">
                      <button 
                        onClick={() => onViewReplay(game.id)}
                        className="geometric-button px-4 py-2 text-[8px] flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Eye size={12} />
                        REPLAY
                      </button>
                      <button 
                         onClick={() => deleteMatch(game.id)}
                         className="p-2 text-ui-red hover:bg-ui-red/10 transition-all opacity-0 group-hover:opacity-100"
                         title="Remove from history"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : view === 'rules' ? (
          <motion.div 
            key="rules"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-ui-blue p-8 border-4 border-ui-border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-ui-purple/20 rotate-45 translate-x-16 -translate-y-16"></div>
              <h4 className="text-[10px] text-ui-orange mb-6 tracking-widest uppercase border-b-2 border-ui-orange w-fit pb-1">Rules & Scoring</h4>
          <div className="grid md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <h5 className="text-[8px] text-ui-yellow uppercase font-bold tracking-widest">:: Card Values ::</h5>
                <div className="grid grid-cols-2 gap-4 text-[9px] uppercase">
                  <div className="flex justify-between border-b border-ui-border pb-1">
                     <span className="text-ui-gray">JACK [J]</span>
                     <span className="text-ui-green">-2 points</span>
                  </div>
                  <div className="flex justify-between border-b border-ui-border pb-1">
                     <span className="text-ui-gray">KING [K]</span>
                     <span className="text-ui-green">0 points</span>
                  </div>
                  <div className="flex justify-between border-b border-ui-border pb-1">
                     <span className="text-ui-gray">ACE [A]</span>
                     <span className="text-ui-orange">1 point</span>
                  </div>
                  <div className="flex justify-between border-b border-ui-border pb-1">
                     <span className="text-ui-gray">QUEEN [Q]</span>
                     <span className="text-ui-red">10 points</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[8px] text-ui-yellow uppercase font-bold tracking-widest">:: Same Rank Bonus ::</h5>
                <p className="text-[9px] text-ui-gray leading-relaxed uppercase tracking-tighter italic">
                  ALIGNING 3 IDENTICAL CARDS IN A HORIZONTAL ROW EQUALS 0 POINTS FOR THAT ROW.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h5 className="text-[8px] text-ui-yellow uppercase font-bold tracking-widest">:: Game Flow ::</h5>
                <div className="space-y-2 text-[9px] uppercase tracking-tighter">
                  <div className="flex gap-2">
                    <span className="text-ui-orange font-bold">STEP 01</span>
                    <span>START BY REVEALING 2 CARDS</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-ui-orange font-bold">STEP 02</span>
                    <span>SWAP CARDS FROM DECK OR DISCARD PILE</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-ui-orange font-bold">STEP 03</span>
                    <span>REVEALING ALL CARDS ENDS THE ROUND</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-ui-purple/10 border border-ui-purple text-[8px] leading-tight">
                 <span className="font-bold text-ui-purple">INFO:</span> THE PLAYER WITH THE LOWEST TOTAL SCORE WINS THE GAME.
              </div>
            </div>
          </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error && (
        <div className="p-4 bg-ui-red/20 border-l-8 border-ui-red text-[8px] tracking-widest">
          Error: {error}
        </div>
      )}
    </motion.div>
  );
}

const PlayerCard: React.FC<{ u: any, onInvite: (id: string) => any, isLoading: boolean }> = ({ u, onInvite, isLoading }) => {
  const isOnline = u.last_active_at && (new Date().getTime() - new Date(u.last_active_at).getTime() < 5 * 60 * 1000);

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="p-3 border-2 border-ui-border bg-bg-dark flex items-center justify-between h-full"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 flex items-center justify-center border ${isOnline ? 'border-ui-green/30 bg-ui-green/10 text-ui-green' : 'border-ui-gray/30 bg-ui-gray/10 text-ui-gray opacity-50'}`}>
          <UserAvatar type={u.avatar} size={16} />
        </div>
        <div className={`text-[10px] uppercase font-bold truncate max-w-[80px] ${isOnline ? 'text-ui-purple' : 'text-ui-gray'}`}>
          {u.username}
          <div className="text-[5px] opacity-40 lowercase">
            {isOnline ? 'online' : 'offline'}
          </div>
        </div>
      </div>
      <button
        onClick={() => onInvite(u.id)}
        disabled={isLoading}
        className="px-3 py-1 border border-ui-yellow text-[8px] font-black text-ui-yellow hover:bg-ui-yellow hover:text-bg-dark transition-all disabled:opacity-30"
      >
        {isLoading ? 'INVITING...' : 'INVITE'}
      </button>
    </motion.div>
  );
}
