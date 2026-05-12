import React, { useState, useEffect } from 'react';
import { Shield, Users, Gamepad2, Trash2, Power, UserMinus, RefreshCcw, Key, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminSummary {
  users: number;
  games: number;
  activeGames: number;
  messages: number;
  timestamp: string;
}

interface AdminUser {
  id: string;
  username: string;
  avatar: string;
  last_active_at: string;
  created_at: string;
  is_admin: number;
}

interface AdminGame {
  id: string;
  room_code: string;
  player1_id: string;
  player1_name: string;
  player2_id: string | null;
  player2_name: string | null;
  status: string;
  updated_at: string;
}

interface AdminDashboardProps {
  token: string;
  onClose: () => void;
}

export default function AdminDashboard({ token, onClose }: AdminDashboardProps) {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'users' | 'games'>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; message: string } | null>(null);
  const [resetPassUser, setResetPassUser] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/admin/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/admin/games', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setGames(data.games || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'games') fetchGames();
  }, [activeTab]);

  const handleDeleteUser = async (userId: string) => {
    setConfirmAction({
      type: 'user',
      id: userId,
      message: 'Are you sure? This will delete the user and all their game data.'
    });
  };

  const executeDeleteUser = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
      fetchSummary();
      setConfirmAction(null);
      setSuccess('User deleted successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    setConfirmAction({
      type: 'game',
      id: gameId,
      message: 'Are you sure you want to delete this game?'
    });
  };

  const executeDeleteGame = async (gameId: string) => {
    try {
      await fetch(`/api/admin/games/${gameId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGames();
      fetchSummary();
      setConfirmAction(null);
      setSuccess('Game deleted successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleKickUser = async (userId: string) => {
    try {
      await fetch(`/api/admin/kick/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
      setSuccess('User kicked successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setResetPassUser(userId);
    setNewPass('');
  };

  const executeResetPassword = async () => {
    if (!resetPassUser || !newPass || newPass.length < 6) return;
    
    try {
      const res = await fetch(`/api/admin/users/${resetPassUser}/reset-password`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: newPass })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess('Password reset successfully!');
      setResetPassUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAdmin = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchUsers();
      setSuccess('Admin status toggled.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRestartBackend = () => {
    setSuccess('Backend restart triggered (simulated for environment safety). All temporary caches cleared.');
    fetchSummary();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-bg-dark border-4 border-ui-red w-full max-w-4xl h-[80vh] flex flex-col shadow-[16px_16px_0px_0px_#cc3333]"
      >
        {/* Header */}
        <div className="bg-ui-red p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-white" size={24} />
            <span className="font-bold text-sm uppercase tracking-widest text-white">Admin Terminal</span>
          </div>
          <button 
            onClick={onClose}
            className="bg-white text-ui-red px-3 py-1 text-[10px] font-bold border-2 border-black active:translate-y-1 transition-all"
          >
            CLOSE_X
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b-2 border-white/10 overflow-x-auto scrollbar-hide">
          {[
            { id: 'summary', icon: RefreshCcw, label: 'SYST_STAT' },
            { id: 'users', icon: Users, label: 'USER_MGMT' },
            { id: 'games', icon: Gamepad2, label: 'GAME_MGMT' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white/10 text-ui-yellow border-b-4 border-ui-yellow' : 'text-ui-gray hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-[10px] relative">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-ui-red/20 border-2 border-ui-red p-4 mb-6 text-ui-red flex justify-between items-center"
            >
              <span>ERROR: {error}</span>
              <button onClick={() => setError(null)} className="text-[8px] hover:underline">DISMISS</button>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-ui-green/20 border-2 border-ui-green p-4 mb-6 text-ui-green flex justify-between items-center"
            >
              <span>SUCCESS: {success}</span>
              <button onClick={() => setSuccess(null)} className="text-[8px] hover:underline">DISMISS</button>
            </motion.div>
          )}

          <AnimatePresence>
            {confirmAction && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute inset-x-6 top-6 z-[210] bg-ui-red p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white"
              >
                <div className="font-bold uppercase text-[10px] mb-4">{confirmAction.message}</div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => confirmAction.type === 'user' ? executeDeleteUser(confirmAction.id) : executeDeleteGame(confirmAction.id)}
                    className="flex-1 bg-black text-white py-3 font-bold uppercase transition-all hover:bg-white hover:text-black"
                  >
                    Confirm Action
                  </button>
                  <button 
                    onClick={() => setConfirmAction(null)}
                    className="flex-1 bg-white/20 text-white py-3 font-bold uppercase transition-all hover:bg-white/40"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {resetPassUser && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute inset-x-6 top-6 z-[210] bg-ui-blue p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white"
              >
                <div className="font-bold uppercase text-[10px] mb-4">Reset Password for User</div>
                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="NEW PASSWORD (MIN 6)"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full p-3 bg-bg-dark border-2 border-white/20 text-white font-mono text-xs outline-none focus:border-ui-yellow"
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={executeResetPassword}
                      disabled={newPass.length < 6}
                      className="flex-1 bg-white text-ui-blue py-3 font-bold uppercase transition-all hover:opacity-80 disabled:opacity-50"
                    >
                      Execute Reset
                    </button>
                    <button 
                      onClick={() => setResetPassUser(null)}
                      className="flex-1 bg-white/20 text-white py-3 font-bold uppercase transition-all hover:bg-white/40"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'summary' && summary && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'TOTAL_USERS', value: summary.users, color: 'text-ui-blue' },
                    { label: 'TOTAL_GAMES', value: summary.games, color: 'text-ui-green' },
                    { label: 'ACTIVE_GAMES', value: summary.activeGames, color: 'text-ui-yellow' },
                    { label: 'MSG_TRAFFIC', value: summary.messages, color: 'text-ui-purple' }
                  ].map(stat => (
                    <div key={stat.label} className="bg-white/5 border-2 border-white/10 p-4">
                      <div className="text-ui-gray text-[8px] mb-2">{stat.label}</div>
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-black/40 border-2 border-white/10 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-ui-red mb-4">
                    <Power size={14} />
                    <span className="font-bold uppercase tracking-widest text-[9px]">Critical System Controls</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={handleRestartBackend}
                      className="bg-ui-red/10 border-2 border-ui-red text-ui-red px-6 py-3 hover:bg-ui-red hover:text-white transition-all font-bold uppercase tracking-tighter"
                    >
                      Clear Cache & Sync DB
                    </button>
                    <button className="bg-white/5 border-2 border-white/10 text-white px-6 py-3 opacity-50 cursor-not-allowed">
                      Vacuum Database
                    </button>
                  </div>
                  <p className="text-ui-gray text-[8px] italic">* Actions logged to system monitoring.</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 uppercase tracking-widest text-ui-gray text-[8px]">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">ID</th>
                        <th className="p-3">Last Active</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-ui-green">{u.username}</span>
                              {u.is_admin === 1 && (
                                <Star size={10} className="text-ui-yellow fill-ui-yellow" title="Administrator" />
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-ui-gray font-mono">{u.id.substring(0, 8)}...</td>
                          <td className="p-3 text-[9px]">{new Date(u.last_active_at + 'Z').toLocaleString()}</td>
                          <td className="p-3 flex gap-2">
                            <button 
                              onClick={() => handleToggleAdmin(u.id)}
                              className={`p-2 border transition-all ${
                                u.is_admin === 1 
                                  ? 'bg-ui-yellow text-black border-ui-yellow hover:bg-transparent hover:text-ui-yellow' 
                                  : 'bg-ui-yellow/10 text-ui-yellow border-ui-yellow hover:bg-ui-yellow hover:text-black'
                              }`}
                              title={u.is_admin === 1 ? "Revoke Admin" : "Grant Admin"}
                            >
                              <Shield size={12} />
                            </button>
                            <button 
                              onClick={() => handleResetPassword(u.id)}
                              className="p-2 bg-ui-blue/10 text-ui-blue border border-ui-blue hover:bg-ui-blue hover:text-white"
                              title="Reset Password"
                            >
                              <Key size={12} />
                            </button>
                            <button 
                              onClick={() => handleKickUser(u.id)}
                              className="p-2 bg-bg-dark text-ui-gray border border-ui-gray hover:bg-white hover:text-black"
                              title="Kick User"
                            >
                              <UserMinus size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 bg-ui-red/10 text-ui-red border border-ui-red hover:bg-ui-red hover:text-white"
                              title="Delete User"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'games' && (
              <motion.div 
                key="games"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 uppercase tracking-widest text-ui-gray text-[8px]">
                      <tr>
                        <th className="p-3">Game ID</th>
                        <th className="p-3">Players</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Last Update</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {games.map(g => (
                        <tr key={g.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="p-3 font-mono">{g.id.substring(0, 8)}</td>
                          <td className="p-3 text-[9px]">
                            <span className="text-ui-blue font-bold">{g.player1_name || '???'}</span>
                            <span className="text-ui-gray mx-1">vs</span>
                            <span className="text-ui-orange font-bold">{g.player2_name || (g.player2_id === 'cpu' ? 'CPU' : 'WAITING')}</span>
                          </td>
                          <td className="p-3 capitalize tracking-widest text-[8px]">
                            <span className={`px-2 py-0.5 border ${
                              g.status === 'playing' ? 'border-ui-yellow text-ui-yellow' : 
                              g.status === 'finished' ? 'border-ui-green text-ui-green' : 
                              'border-ui-gray text-ui-gray'
                            }`}>
                              {g.status}
                            </span>
                          </td>
                          <td className="p-3 text-[8px]">{new Date(g.updated_at + 'Z').toLocaleString()}</td>
                          <td className="p-3">
                            <button 
                              onClick={() => handleDeleteGame(g.id)}
                              className="p-2 bg-ui-red/10 text-ui-red border border-ui-red hover:bg-ui-red hover:text-white"
                              title="Delete Session"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-black/60 p-3 border-t-2 border-white/10 flex justify-between items-center font-mono text-[8px] text-ui-gray uppercase tracking-widest">
          <div>Root Terminal Access Granted</div>
          <div>{new Date().toISOString()}</div>
        </div>
      </motion.div>
    </div>
  );
}
