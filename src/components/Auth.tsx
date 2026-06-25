import React, { useState } from 'react';
import { User } from '../types.ts';

interface AuthProps {
  onLogin: (token: string, user: User) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const endpoint = isLogin ? `${baseUrl}/api/auth/login` : `${baseUrl}/api/auth/register`;
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto mt-10 p-8 geometric-border transition-colors duration-500 ${isLogin ? '!bg-ui-blue' : '!bg-ui-purple'}`}>
      <h2 className="text-sm mb-8 text-center text-ui-yellow tracking-tighter">
        {isLogin ? 'Login' : 'Create Account'}
      </h2>

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

      <div className="mt-8 text-center bg-bg-dark/50 p-4 border-t border-ui-border">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-[10px] text-ui-gray hover:text-ui-yellow transition-colors tracking-widest"
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}
