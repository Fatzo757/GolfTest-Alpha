import React, { useState } from 'react';
import { Palette, Layers, X, Check, User as UserIcon, Volume2, VolumeX, Clock, Calendar, Key } from 'lucide-react';
import { motion } from 'motion/react';
import UserAvatar, { AVATAR_LIST } from './UserAvatar';
import { soundService } from '../services/soundService';

interface SettingsProps {
  user: any;
  token: string;
  onUpdate: (user: any) => void;
  onClose: () => void;
}

const THEMES = [
  { id: 'default', name: 'Cyber Neon', primary: 'bg-ui-yellow', secondary: 'bg-ui-purple' },
  { id: 'retro', name: 'Classic Gameboy', primary: 'bg-green-600', secondary: 'bg-green-900' },
  { id: 'slate', name: 'Deep Space', primary: 'bg-slate-400', secondary: 'bg-slate-800' },
  { id: 'voltage', name: 'High Voltage', primary: 'bg-ui-orange', secondary: 'bg-bg-dark' },
  { id: 'ocean', name: 'Ocean Depth', primary: 'bg-cyan-400', secondary: 'bg-blue-900' },
  { id: 'crimson', name: 'Blood Moon', primary: 'bg-red-500', secondary: 'bg-rose-900' },
  { id: 'midnight', name: 'Midnight Violet', primary: 'bg-violet-400', secondary: 'bg-indigo-900' },
  { id: 'matrix', name: 'Matrix Terminal', primary: 'bg-emerald-400', secondary: 'bg-emerald-900' },
  { id: 'bubblegum', name: 'Bubblegum', primary: 'bg-pink-400', secondary: 'bg-fuchsia-900' },
  { id: 'gold', name: 'Royal Gold', primary: 'bg-amber-400', secondary: 'bg-yellow-900' },
];

const CARD_STYLES = [
  { id: 'classic', name: 'Classic Pixel', description: 'Clean retro geometric shapes' },
  { id: 'modern', name: 'Modern Flat', description: 'Bold colors and symbols' },
  { id: 'sketch', name: 'Sketchy Hand-drawn', description: 'Hand-inked rough aesthetic' },
  { id: 'retro_grid', name: 'Synthwave Grid', description: '80s retro sunset grid' },
  { id: 'minimal', name: 'Minimalist', description: 'Clean, simple outlines' },
  { id: 'cyber', name: 'Cyber Circuit', description: 'Matrix circuit board lines' },
];

const TIMEZONES = [
  'UTC', 'GMT', 'EST', 'CST', 'MST', 'PST', 'AEST', 'AWST', 'CET', 'EET'
];

export default function Settings({ user, token, onUpdate, onClose }: SettingsProps) {
  const [theme, setTheme] = useState(user.theme || 'default');
  const [cardStyle, setCardStyle] = useState(user.card_style || 'classic');
  const [avatar, setAvatar] = useState(user.avatar || 'user');
  const [muteSounds, setMuteSounds] = useState(!!user.mute_sounds);
  const [soundVolume, setSoundVolume] = useState(user.sound_volume ?? 1.0);
  const [timeZone, setTimeZone] = useState(user.time_zone || 'UTC');
  const [timeFormat, setTimeFormat] = useState(user.time_format || '12h');
  const [showDate, setShowDate] = useState(!!user.show_date);
  const [showMoveDate, setShowMoveDate] = useState(!!user.show_move_date);
  const [saving, setSaving] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (passwords.next !== passwords.confirm) {
      setPassError('Passwords do not match');
      return;
    }

    if (passwords.next.length < 6) {
      setPassError('New password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.next
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPassSuccess(true);
      setPasswords({ current: '', next: '', confirm: '' });
      setTimeout(() => setShowPasswordChange(false), 2000);
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          theme, 
          card_style: cardStyle,
          mute_sounds: muteSounds,
          sound_volume: soundVolume,
          time_zone: timeZone,
          time_format: timeFormat,
          show_date: showDate,
          show_move_date: showMoveDate
        })
      });
      
      const avatarRes = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar })
      });

      if (res.ok && avatarRes.ok) {
        soundService.setMuted(muteSounds);
        soundService.setVolume(soundVolume);
        onUpdate({ 
          ...user, 
          theme, 
          card_style: cardStyle, 
          avatar,
          mute_sounds: muteSounds ? 1 : 0,
          sound_volume: soundVolume,
          time_zone: timeZone,
          time_format: timeFormat,
          show_date: showDate ? 1 : 0,
          show_move_date: showMoveDate ? 1 : 0
        });
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm px-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-bg-dark border-4 border-ui-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b-4 border-ui-border flex justify-between items-center bg-ui-blue flex-shrink-0">
          <div className="flex items-center gap-3">
            <Palette className="text-ui-yellow" size={20} />
            <h2 className="text-sm font-bold text-ui-yellow uppercase tracking-widest">System Settings</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-ui-red transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-grow relative">
          {statusMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 border-2 mb-6 flex justify-between items-center ${statusMsg.type === 'success' ? 'bg-ui-green/10 border-ui-green text-ui-green' : 'bg-ui-red/10 border-ui-red text-ui-red'}`}
            >
              <span className="text-[10px] uppercase font-bold">{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="text-[10px]">✕</button>
            </motion.div>
          )}

          {/* Audio Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 size={14} className="text-ui-gray" />
              <h3 className="text-[10px] text-ui-gray uppercase font-bold tracking-widest">Audio Control</h3>
            </div>
            <button
              onClick={() => setMuteSounds(!muteSounds)}
              className={`w-full p-4 border-4 flex items-center justify-between transition-all ${
                muteSounds ? 'border-ui-red bg-ui-red/5' : 'border-ui-green bg-ui-green/5'
              }`}
            >
              <div className="flex items-center gap-4">
                {muteSounds ? <VolumeX className="text-ui-red" size={20} /> : <Volume2 className="text-ui-green" size={20} />}
                <span className={`text-[10px] font-bold uppercase ${muteSounds ? 'text-ui-red' : 'text-ui-green'}`}>
                  {muteSounds ? 'Sounds Muted' : 'Sounds Enabled'}
                </span>
              </div>
              <div className={`w-12 h-6 border-2 relative transition-all ${muteSounds ? 'border-ui-red bg-ui-red/20' : 'border-ui-green bg-ui-green/20'}`}>
                <div className={`absolute top-0 bottom-0 w-1/2 transition-all ${muteSounds ? 'right-0 bg-ui-red' : 'left-0 bg-ui-green'}`} />
              </div>
            </button>
            
            <div className={`w-full p-4 flex flex-col gap-2 transition-all ${muteSounds ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-ui-gray">Volume</span>
                <span className="text-[10px] font-bold uppercase text-ui-yellow">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1.0" 
                step="0.1"
                value={soundVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSoundVolume(val);
                  soundService.setVolume(val);
                  if (val > 0 && !muteSounds) {
                    soundService.playPlay(); // small preview
                  }
                }}
                className="w-full h-2 bg-ui-border rounded-lg appearance-none cursor-pointer accent-ui-yellow"
              />
            </div>
          </section>

          {/* Time & Locale Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-ui-gray" />
              <h3 className="text-[10px] text-ui-gray uppercase font-bold tracking-widest">Time & Regional</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] text-ui-gray uppercase font-bold">Time Zone Selection</label>
                <select 
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[10px] text-white uppercase font-bold focus:border-ui-yellow outline-none"
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] text-ui-gray uppercase font-bold">Time Format</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTimeFormat('12h')}
                    className={`flex-1 py-3 text-[10px] border-2 font-bold transition-all ${timeFormat === '12h' ? 'border-ui-yellow bg-ui-yellow/10 text-ui-yellow' : 'border-ui-border text-ui-gray'}`}
                  >
                    12H (AM/PM)
                  </button>
                  <button 
                    onClick={() => setTimeFormat('24h')}
                    className={`flex-1 py-3 text-[10px] border-2 font-bold transition-all ${timeFormat === '24h' ? 'border-ui-yellow bg-ui-yellow/10 text-ui-yellow' : 'border-ui-border text-ui-gray'}`}
                  >
                    24H (00:00)
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDate(!showDate)}
              className={`w-full p-4 border-4 flex items-center justify-between transition-all ${
                showDate ? 'border-ui-blue bg-ui-blue/5' : 'border-ui-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <Calendar className={showDate ? 'text-ui-blue' : 'text-ui-gray'} size={20} />
                <span className={`text-[10px] font-bold uppercase ${showDate ? 'text-ui-blue' : 'text-ui-gray'}`}>
                  {showDate ? 'Display Date Enabled' : 'Date Display Disabled'}
                </span>
              </div>
              <Check size={16} className={showDate ? 'text-ui-blue opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setShowMoveDate(!showMoveDate)}
              className={`w-full p-4 border-4 flex items-center justify-between transition-all ${
                showMoveDate ? 'border-ui-yellow bg-ui-yellow/5' : 'border-ui-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <Clock className={showMoveDate ? 'text-ui-yellow' : 'text-ui-gray'} size={20} />
                <span className={`text-[10px] font-bold uppercase ${showMoveDate ? 'text-ui-yellow' : 'text-ui-gray'}`}>
                  {showMoveDate ? 'Show Date in Move History' : 'Hide Date in Move History'}
                </span>
              </div>
              <Check size={16} className={showMoveDate ? 'text-ui-yellow opacity-100' : 'opacity-0'} />
            </button>
          </section>

          {/* Theme Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={14} className="text-ui-gray" />
              <h3 className="text-[10px] text-ui-gray uppercase font-bold tracking-widest">Visual Theme</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`h-full p-4 border-4 text-left transition-all relative ${
                    theme === t.id ? 'border-ui-yellow bg-ui-yellow/5' : 'border-ui-border hover:border-ui-gray'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-bold uppercase ${theme === t.id ? 'text-ui-yellow' : 'text-text-main'}`}>
                      {t.name}
                    </span>
                    {theme === t.id && <Check size={14} className="text-ui-yellow" />}
                  </div>
                  <div className="flex gap-2">
                    <div className={`w-8 h-4 ${t.primary} border border-black`}></div>
                    <div className={`w-8 h-4 ${t.secondary} border border-black`}></div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Card Graphics Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-ui-gray" />
              <h3 className="text-[10px] text-ui-gray uppercase font-bold tracking-widest">Card Graphics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CARD_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCardStyle(s.id)}
                  className={`h-full p-6 border-4 text-left transition-all flex items-center justify-between ${
                    cardStyle === s.id ? 'border-ui-green bg-ui-green/5' : 'border-ui-border hover:border-ui-gray'
                  }`}
                >
                  <div>
                    <div className={`text-[10px] font-bold uppercase mb-1 ${cardStyle === s.id ? 'text-ui-green' : 'text-text-main'}`}>
                      {s.name}
                    </div>
                    <div className="text-[8px] text-ui-gray uppercase">{s.description}</div>
                  </div>
                  {cardStyle === s.id && <Check size={16} className="text-ui-green" />}
                </button>
              ))}
            </div>
          </section>

          {/* Avatar Section */}
          <section className="space-y-4 pt-4 border-t border-ui-border/20">
            <div className="flex items-center gap-2 mb-4">
              <UserIcon size={14} className="text-ui-gray" />
              <h3 className="text-[10px] text-ui-gray uppercase font-bold tracking-widest">Player Icon</h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_LIST.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-12 h-12 flex items-center justify-center border-2 transition-all ${
                    avatar === a ? 'border-ui-yellow bg-ui-yellow/10 text-ui-yellow shadow-[2px_2px_0px_0px_rgba(255,184,0,0.5)]' : 'border-ui-border text-ui-gray opacity-40 hover:opacity-100'
                  }`}
                  title={a}
                >
                  <UserAvatar type={a} size={20} />
                </button>
              ))}
            </div>
          </section>
          
          {/* Security Section */}
          <section className="space-y-4 pt-4 border-t border-ui-border/20">
            <div className="flex items-center gap-2 mb-4">
              <Key size={14} className="text-ui-gray" />
              <h3 className="text-[10px] text-ui-gray uppercase font-bold tracking-widest">Security</h3>
            </div>
            
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full py-3 border-2 border-ui-border text-[10px] uppercase font-bold text-ui-gray hover:text-white hover:border-white transition-all"
              >
                Change Account Password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="p-4 border-2 border-ui-border bg-white/5 space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] text-ui-gray uppercase font-bold">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[10px] outline-none focus:border-ui-yellow"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] text-ui-gray uppercase font-bold">New Password (MIN 6)</label>
                  <input
                    type="password"
                    required
                    value={passwords.next}
                    onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                    className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[10px] outline-none focus:border-ui-yellow"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] text-ui-gray uppercase font-bold">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[10px] outline-none focus:border-ui-yellow"
                  />
                </div>

                {passError && (
                  <div className="text-[8px] text-ui-red uppercase font-bold animate-pulse">{passError}</div>
                )}
                {passSuccess && (
                  <div className="text-[8px] text-ui-green uppercase font-bold">Password updated successfully!</div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-ui-yellow text-bg-dark text-[8px] font-bold uppercase transition-all disabled:opacity-50"
                  >
                    {saving ? 'UPDATING...' : 'UPDATE PASSWORD'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPassError(null);
                    }}
                    className="flex-1 py-3 border-2 border-ui-gray text-ui-gray text-[8px] font-bold uppercase"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Danger Zone */}
          <section className="pt-8 border-t-2 border-ui-red/20 space-y-4">
             <div className="text-[10px] text-ui-red uppercase font-bold tracking-widest">Danger Zone</div>
             
             {!showConfirmReset ? (
               <button 
                 onClick={() => setShowConfirmReset(true)}
                 className="w-full py-4 border-4 border-ui-red/30 text-ui-red/60 text-[8px] uppercase font-bold hover:bg-ui-red hover:text-white hover:border-ui-red transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,0.2)]"
               >
                 Initiate Hard Reset
               </button>
             ) : (
               <div className="p-4 border-4 border-ui-red bg-ui-red/5 space-y-4 animate-pulse">
                 <div className="text-[9px] text-ui-red font-black uppercase text-center leading-tight">
                   ARE YOU ABSOLUTELY SURE?<br/>ALL MATCH DATA WILL BE PERMANENTLY DELETED.
                 </div>
                 <div className="flex gap-2">
                   <button 
                     onClick={async () => {
                       setSaving(true);
                       try {
                          const res = await fetch('/api/users/stats/reset', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          
                          if (res.ok) {
                            setStatusMsg({ type: 'success', text: 'Statistics and Match History have been hard reset. Reloading...' });
                            setTimeout(() => window.location.reload(), 2000);
                          } else {
                            const errData = await res.json();
                            setStatusMsg({ type: 'error', text: errData.error || 'Failed to reset statistics' });
                            setShowConfirmReset(false);
                          }
                       } catch (err) { 
                         console.error(err); 
                         setStatusMsg({ type: 'error', text: 'Connection error while resetting statistics' });
                         setShowConfirmReset(false);
                       } finally {
                         setSaving(false);
                       }
                     }}
                     disabled={saving}
                     className="flex-1 py-3 bg-ui-red text-white text-[8px] uppercase font-bold hover:bg-white hover:text-ui-red transition-all disabled:opacity-50"
                   >
                     {saving ? 'RESETTING...' : 'YES, ERASE EVERYTHING'}
                   </button>
                   <button 
                     onClick={() => setShowConfirmReset(false)}
                     disabled={saving}
                     className="flex-1 py-3 border-2 border-ui-gray text-ui-gray text-[8px] uppercase font-bold hover:bg-ui-gray hover:text-white transition-all disabled:opacity-50"
                   >
                     CANCEL
                   </button>
                 </div>
               </div>
             )}
          </section>
        </div>

        <div className="p-6 border-t-4 border-ui-border bg-bg-dark flex gap-4 flex-shrink-0">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex-1 geometric-button py-4 text-[10px] uppercase font-bold shadow-[4px_4px_0px_0px_#000]"
          >
            {saving ? 'Saving...' : 'Apply Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-8 border-4 border-ui-border text-[10px] uppercase font-bold hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
