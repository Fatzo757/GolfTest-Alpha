import React, { useState } from 'react';
import { User } from '../types.ts';
import { useAuthStore } from '../store/useAuthStore';
import { getApiUrl, getApiBaseUrl, setCustomApiBaseUrl } from '../lib/api';
import { applyLiveUpdate, resetLiveUpdateBundle } from '../services/liveUpdateService';
import { Server, Settings, RefreshCw, RotateCcw } from 'lucide-react';

interface AuthProps {
  onLogin?: (token: string, user: User) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const loginInStore = useAuthStore((state) => state.login);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Server Config state
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiBaseUrl(serverUrl);
    setError('Server URL updated! Try logging in again.');
    setShowServerConfig(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = getApiUrl(isLogin ? '/api/auth/login' : '/api/auth/register');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setError('Cannot reach server API. Please check your backend URL or server status.');
        setShowServerConfig(true);
        return;
      }

      const data = await res.json();

      if (res.ok) {
        if (onLogin) {
          onLogin(data.token, data.user);
        } else {
          loginInStore(data.token, data.user);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(`Connection error: ${err.message || 'Server unreachable'}`);
      setShowServerConfig(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto mt-10 p-8 geometric-border transition-colors duration-500 ${isLogin ? '!bg-[#008000]' : '!bg-[#005c00]'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm text-ui-yellow tracking-tighter uppercase font-bold">
          {isLogin ? 'Login' : 'Create Account'}
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => applyLiveUpdate()}
            className="text-ui-green hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-mono font-bold"
            title="Reboot WebView to load latest update"
          >
            <RefreshCw size={12} /> Restart
          </button>
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="text-white/60 hover:text-ui-yellow transition-colors flex items-center gap-1 text-[10px] uppercase font-mono"
          >
            <Server size={12} /> Server
          </button>
        </div>
      </div>

      {showServerConfig && (
        <form onSubmit={handleSaveServerUrl} className="mb-6 p-4 bg-black/90 border-2 border-ui-yellow space-y-3">
          <div className="text-[10px] text-ui-yellow font-bold uppercase tracking-widest flex items-center gap-2">
            <Settings size={12} /> Server Endpoint Config
          </div>
          <p className="text-[9px] text-white/70">
            Set your backend server IP/Domain (e.g. <code>http://192.168.1.50:3000</code> or <code>https://your-domain.com</code>).
          </p>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://your-server-ip:3000"
            className="w-full bg-bg-dark border border-ui-border p-2 text-xs text-white font-mono"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-1.5 bg-ui-yellow text-black font-bold text-[10px] uppercase hover:bg-yellow-400"
            >
              Save Server URL
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomApiBaseUrl('');
                setServerUrl('');
              }}
              className="py-1.5 px-3 bg-white/10 text-white font-bold text-[10px] uppercase hover:bg-white/20"
            >
              Reset
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-black/80 p-4 border border-ui-border/40 shadow-inner">
          <label className="block text-[10px] text-ui-yellow mb-3 uppercase tracking-widest font-bold">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-bg-dark border-2 border-ui-border p-3 text-xs focus:outline-none focus:border-ui-yellow text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
            required
          />
        </div>

        <div className="bg-black/80 p-4 border border-ui-border/40 shadow-inner">
          <label className="block text-[10px] text-ui-yellow mb-3 uppercase tracking-widest font-bold">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-bg-dark border-2 border-ui-border p-3 text-xs focus:outline-none focus:border-ui-yellow text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
            required
          />
        </div>

        {error && <div className="text-ui-red text-[10px] border-l-2 border-ui-red pl-2">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full geometric-button text-xs"
        >
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
        </button>
      </form>

      <div className="mt-8 text-center bg-bg-dark/50 p-4 border-t border-ui-border flex flex-col gap-3">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-[10px] text-ui-gray hover:text-ui-yellow transition-colors tracking-widest uppercase font-bold"
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
        </button>

        <div className="flex gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => applyLiveUpdate()}
            className="flex-1 py-2 bg-ui-green/20 border border-ui-green text-ui-green hover:bg-ui-green hover:text-black transition-all text-[10px] uppercase font-bold flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={12} /> Restart App
          </button>
          <button
            type="button"
            onClick={() => resetLiveUpdateBundle()}
            className="py-2 px-3 bg-ui-red/20 border border-ui-red text-ui-red hover:bg-ui-red hover:text-white transition-all text-[10px] uppercase font-bold flex items-center justify-center gap-1.5"
            title="Reset to factory default APK bundle"
          >
            <RotateCcw size={12} /> Reset Cache
          </button>
        </div>
      </div>
    </div>
  );
}
