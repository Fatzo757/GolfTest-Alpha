import React, { useState } from 'react';
import { Palette, Layers, X, Check, User as UserIcon, Volume2, VolumeX, Clock, Calendar, Key } from 'lucide-react';
import { motion } from 'motion/react';
import UserAvatar, { AVATAR_LIST } from './UserAvatar';
import { soundService } from '../services/soundService';
import CardComponent from './Card';

interface SettingsProps {
  user: any;
  token: string;
  onUpdate: (user: any) => void;
  onClose: () => void;
}

const NEON_THEMES = [
  { id: 'default', name: 'Cyber Neon', primary: 'bg-[#ffcd75]', secondary: 'bg-[#5d275d]' },
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

const WIN32_THEMES = [
  { id: 'win_green', name: 'Classic Green', primary: 'bg-[#008000]', secondary: 'bg-[#c0c0c0]' },
  { id: 'win_teal', name: 'Desktop Teal', primary: 'bg-[#008080]', secondary: 'bg-[#c0c0c0]' },
  { id: 'win_burgundy', name: 'Burgundy', primary: 'bg-[#800000]', secondary: 'bg-[#c0c0c0]' },
  { id: 'win_gray', name: 'Neutral Gray', primary: 'bg-[#808080]', secondary: 'bg-[#c0c0c0]' },
];

const CARD_STYLES = [
  { id: 'classic', name: 'Classic Pixel', description: 'Clean retro geometric shapes' },
  { id: 'modern', name: 'Modern Flat', description: 'Bold colors and symbols' },
  { id: 'sketch', name: 'Sketchy Hand-drawn', description: 'Hand-inked rough aesthetic' },
  { id: 'retro_grid', name: 'Synthwave Grid', description: '80s retro sunset grid' },
  { id: 'minimal', name: 'Minimalist', description: 'Clean, simple outlines' },
  { id: 'cyber', name: 'Cyber Circuit', description: 'Matrix circuit board lines' },
];

const SOUND_PROFILES = [
  { id: 'classic', name: 'Classic Synthetic', description: 'Standard digital tones' },
  { id: 'arcade', name: 'Retro Arcade', description: '8-bit chip-tune blips' },
  { id: 'casino', name: 'Casino / Cards', description: 'Metallic chimes and snaps' },
  { id: 'minimal', name: 'Minimalist', description: 'Soft, low-frequency clicks' }
];

const TIMEZONES = [
  'UTC', 'GMT', 'EST', 'CST', 'MST', 'PST', 'AEST', 'AWST', 'CET', 'EET'
];

export default function Settings({ user, token, onUpdate, onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'display' | 'audio' | 'preferences' | 'account'>('display');
  const [theme, setTheme] = useState(user.theme || 'default');
  const [uiMode, setUiMode] = useState(user.ui_mode || 'retro');
  const [cardStyle, setCardStyle] = useState(user.card_style || 'classic');
  const [cardBackStyle, setCardBackStyle] = useState(user.card_back_style || 'classic');
  const [cardBackColor, setCardBackColor] = useState(user.card_back_color || 'ui-red');
  const [cardBackSecondaryColor, setCardBackSecondaryColor] = useState(user.card_back_secondary_color || 'white');
  const [avatar, setAvatar] = useState(user.avatar || 'user');
  const [muteSounds, setMuteSounds] = useState(!!user.mute_sounds);
  const [soundVolume, setSoundVolume] = useState(user.sound_volume ?? 1.0);
  const [soundProfile, setSoundProfile] = useState(user.sound_profile || 'classic');
  const [timeZone, setTimeZone] = useState(user.time_zone || 'UTC');
  const [timeFormat, setTimeFormat] = useState(user.time_format || '12h');
  const [showDate, setShowDate] = useState(!!user.show_date);
  const [showMoveDate, setShowMoveDate] = useState(!!user.show_move_date);
  const [pushGameInvites, setPushGameInvites] = useState(user.push_game_invites !== 0);
  const [pushTurnReminders, setPushTurnReminders] = useState(user.push_turn_reminders !== 0);
  const [uiScale, setUiScale] = useState(user.ui_scale || 1.0);
  const [cardScale, setCardScale] = useState(user.card_scale || 1.0);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(user.scanlines_enabled !== 0);
  const [saving, setSaving] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isWin32Mode = uiMode === 'classic' || uiMode === 'modern_win32';
  const activeThemes = isWin32Mode ? WIN32_THEMES : NEON_THEMES;

  const handleUiModeChange = (newMode: string) => {
    setUiMode(newMode);
    const isNowWin32 = newMode === 'classic' || newMode === 'modern_win32';
    const isCurrentlyWin32Theme = WIN32_THEMES.some(t => t.id === theme);
    
    if (isNowWin32 && !isCurrentlyWin32Theme) {
      setTheme('win_green');
    } else if (!isNowWin32 && isCurrentlyWin32Theme) {
      setTheme('default');
    }
  };

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
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/change-password`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          theme,
          ui_mode: uiMode,
          card_style: cardStyle,
          card_back_style: cardBackStyle,
          card_back_color: cardBackColor,
          card_back_secondary_color: cardBackSecondaryColor,
          mute_sounds: muteSounds,
          sound_volume: soundVolume,
          sound_profile: soundProfile,
          time_zone: timeZone,
          time_format: timeFormat,
          show_date: showDate,
          show_move_date: showMoveDate,
          push_game_invites: pushGameInvites,
          push_turn_reminders: pushTurnReminders,
          ui_scale: uiScale,
          card_scale: cardScale,
          scanlines_enabled: scanlinesEnabled ? 1 : 0
        }),
      });

      const avatarRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/users/avatar`, {
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
          ui_mode: uiMode,
          card_style: cardStyle,
          card_back_style: cardBackStyle,
          card_back_color: cardBackColor,
          card_back_secondary_color: cardBackSecondaryColor,
          avatar,
          mute_sounds: muteSounds ? 1 : 0,
          sound_volume: soundVolume,
          sound_profile: soundProfile,
          time_zone: timeZone,
          time_format: timeFormat,
          show_date: showDate ? 1 : 0,
          show_move_date: showMoveDate ? 1 : 0,
          push_game_invites: pushGameInvites ? 1 : 0,
          push_turn_reminders: pushTurnReminders ? 1 : 0,
          ui_scale: uiScale,
          card_scale: cardScale
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
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-2xl bg-bg-dark border-t-4 border-x-4 md:border-4 border-ui-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col max-h-[90vh] rounded-t-2xl md:rounded-none pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-0 theme-${user.theme || 'default'}`}
      >
        <div className={`p-6 border-b-4 border-ui-border flex justify-between items-center bg-ui-blue flex-shrink-0 ui-mode-${user.ui_mode || 'retro'}`}>
          <div className="flex items-center gap-3">
            <Palette className="text-ui-yellow" size={20} />
            <h2 className="text-sm font-bold text-ui-yellow uppercase tracking-widest">System Settings</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-ui-red transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className={`flex border-b-4 border-ui-border bg-bg-dark flex-shrink-0 sticky top-0 z-10 ui-mode-${user.ui_mode || 'retro'}`}>
          {(['display', 'audio', 'preferences', 'account'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-xs uppercase font-bold border-b-4 transition-all ${activeTab === tab ? 'border-ui-yellow text-ui-yellow bg-ui-yellow/5' : 'border-transparent text-ui-gray hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-grow relative">
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 border-2 mb-6 flex justify-between items-center ui-mode-${user.ui_mode || 'retro'} ${statusMsg.type === 'success' ? 'bg-ui-green/10 border-ui-green text-ui-green' : 'bg-ui-red/10 border-ui-red text-ui-red'}`}
            >
              <span className="text-[12px] uppercase font-bold">{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="text-[12px]">✕</button>
            </motion.div>
          )}

          {/* Display Settings */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Display Scale</h3>
            </div>
            <div className="p-4 border-2 border-ui-border flex flex-col gap-4 md:gap-2 md:flex-row">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[12px] font-bold text-ui-yellow uppercase">Font Size</label>
                <div className="bg-black/40 border-2 border-ui-border p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-white font-bold text-[12px]">
                    <span className="opacity-70">50%</span>
                    <span className="text-ui-yellow text-[14px]">{Math.round(uiScale * 100)}%</span>
                    <span className="opacity-70">150%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={uiScale}
                    onChange={(e) => setUiScale(parseFloat(e.target.value))}
                    className="w-full accent-ui-yellow cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[12px] font-bold text-ui-yellow uppercase">Card Size</label>
                <div className="bg-black/40 border-2 border-ui-border p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-white font-bold text-[12px]">
                    <span className="opacity-70">50%</span>
                    <span className="text-ui-yellow text-[14px]">{Math.round(cardScale * 100)}%</span>
                    <span className="opacity-70">150%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={cardScale}
                    onChange={(e) => setCardScale(parseFloat(e.target.value))}
                    className="w-full accent-ui-yellow cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <p className="text-[12px] text-gray-300">Adjust these sizes to optimize the game for your mobile device display.</p>
          </section>
          )}

          {/* Audio Section */}
          {activeTab === 'audio' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Volume2 size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Audio Control</h3>
            </div>
            <button
              onClick={() => setMuteSounds(!muteSounds)}
              className={`w-full p-4 border-4 flex items-center justify-between transition-all ${muteSounds ? 'border-ui-red bg-ui-red/5' : 'border-ui-green bg-ui-green/5'
                }`}
            >
              <div className="flex items-center gap-4">
                {muteSounds ? <VolumeX className="text-ui-red" size={20} /> : <Volume2 className="text-ui-green" size={20} />}
                <span className={`text-[12px] font-bold uppercase ${muteSounds ? 'text-ui-red' : 'text-ui-green'}`}>
                  {muteSounds ? 'Sounds Muted' : 'Sounds Enabled'}
                </span>
              </div>
              <div className={`w-12 h-6 border-2 relative transition-all ${muteSounds ? 'border-ui-red bg-ui-red/20' : 'border-ui-green bg-ui-green/20'}`}>
                <div className={`absolute top-0 bottom-0 w-1/2 transition-all ${muteSounds ? 'right-0 bg-ui-red' : 'left-0 bg-ui-green'}`} />
              </div>
            </button>

            <div className={`w-full p-4 flex flex-col gap-2 transition-all ${muteSounds ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase text-ui-gray">Volume</span>
                <span className="text-[12px] font-bold uppercase text-ui-yellow">{Math.round(soundVolume * 100)}%</span>
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
              
              <div className="mt-4 space-y-2">
                <span className="text-[12px] font-bold uppercase text-ui-gray">Sound Profile</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SOUND_PROFILES.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setSoundProfile(profile.id);
                        soundService.setProfile(profile.id);
                        if (!muteSounds) soundService.playTurn();
                      }}
                      className={`p-3 border-2 text-left transition-all ${
                        soundProfile === profile.id 
                          ? 'border-text-main bg-text-main/10' 
                          : 'border-ui-border hover:border-text-main/50'
                      }`}
                    >
                      <div className={`text-[12px] font-bold uppercase mb-1 text-text-main`}>
                        {profile.name}
                      </div>
                      <div className="text-xs text-white/80 font-sans">
                        {profile.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
          )}

          {/* Time & Locale Section */}
          {activeTab === 'preferences' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Time & Regional</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-ui-gray uppercase font-bold">Time Zone Selection</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[12px] text-white uppercase font-bold focus:border-ui-yellow outline-none"
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-ui-gray uppercase font-bold">Time Format</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeFormat('12h')}
                    className={`flex-1 py-3 text-[12px] border-2 font-bold transition-all ${timeFormat === '12h' ? 'border-ui-yellow bg-ui-yellow/10 text-ui-yellow' : 'border-ui-border text-text-main'}`}
                  >
                    12H (AM/PM)
                  </button>
                  <button
                    onClick={() => setTimeFormat('24h')}
                    className={`flex-1 py-3 text-[12px] border-2 font-bold transition-all ${timeFormat === '24h' ? 'border-ui-yellow bg-ui-yellow/10 text-ui-yellow' : 'border-ui-border text-text-main'}`}
                  >
                    24H (00:00)
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDate(!showDate)}
              className={`w-full p-4 border-4 flex items-center justify-between transition-all ${showDate ? 'border-ui-blue bg-ui-blue/5' : 'border-ui-border'
                }`}
            >
              <div className="flex items-center gap-4">
                <Calendar className={showDate ? 'text-ui-blue' : 'text-text-main'} size={20} />
                <span className={`text-[12px] font-bold uppercase ${showDate ? 'text-ui-blue' : 'text-text-main'}`}>
                  {showDate ? 'Display Date Enabled' : 'Date Display Disabled'}
                </span>
              </div>
              <Check size={16} className={showDate ? 'text-ui-blue opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setShowMoveDate(!showMoveDate)}
              className={`w-full p-4 border-4 flex items-center justify-between transition-all ${showMoveDate ? 'border-ui-yellow bg-ui-yellow/5' : 'border-ui-border'
                }`}
            >
              <div className="flex items-center gap-4">
                <Clock className={showMoveDate ? 'text-ui-yellow' : 'text-text-main'} size={20} />
                <span className={`text-[12px] font-bold uppercase ${showMoveDate ? 'text-ui-yellow' : 'text-text-main'}`}>
                  {showMoveDate ? 'Show Date in Move History' : 'Hide Date in Move History'}
                </span>
              </div>
              <Check size={16} className={showMoveDate ? 'text-ui-yellow opacity-100' : 'opacity-0'} />
            </button>
          </section>
          )}

          {/* Theme Section */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Palette size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Visual Theme</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`h-full p-4 border-4 text-left transition-all relative ${theme === t.id ? 'border-ui-yellow bg-ui-yellow/5' : 'border-ui-border hover:border-ui-gray'
                    }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[12px] font-bold uppercase ${theme === t.id ? 'text-ui-yellow' : 'text-text-main'}`}>
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
          )}

          {/* UI Mode Section */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Layout Style</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => handleUiModeChange('retro')}
                className={`h-full p-4 border-4 text-left transition-all flex flex-col items-center justify-center gap-2 ${uiMode === 'retro' ? 'border-ui-yellow bg-ui-yellow/5' : 'border-ui-border hover:border-ui-gray'
                  }`}
              >
                <div className="text-[12px] font-bold uppercase text-ui-yellow text-center">Classic Retro</div>
                <div className="text-xs text-white/80 text-center uppercase">8-Bit Blocky Shapes</div>
                {uiMode === 'retro' && <Check size={16} className="text-ui-yellow mt-2" />}
              </button>
              <button
                onClick={() => handleUiModeChange('modern')}
                className={`h-full p-4 border-4 text-left transition-all flex flex-col items-center justify-center gap-2 ${uiMode === 'modern' ? 'border-ui-green bg-ui-green/5' : 'border-ui-border hover:border-ui-gray'
                  }`}
              >
                <div className="text-[12px] font-bold uppercase text-ui-green text-center">Modern Glass</div>
                <div className="text-xs text-white/80 text-center uppercase">Rounded Glassmorphism</div>
                {uiMode === 'modern' && <Check size={16} className="text-ui-green mt-2" />}
              </button>
              <button
                onClick={() => handleUiModeChange('classic')}
                className={`h-full p-4 border-4 text-left transition-all flex flex-col items-center justify-center gap-2 ${uiMode === 'classic' ? 'border-ui-orange bg-ui-orange/5' : 'border-ui-border hover:border-ui-gray'
                  }`}
              >
                <div className="text-[12px] font-bold uppercase text-ui-orange text-center">Classic Win32</div>
                <div className="text-xs text-white/80 text-center uppercase">90s Bevels & Gray</div>
                {uiMode === 'classic' && <Check size={16} className="text-ui-orange mt-2" />}
              </button>
              <button
                onClick={() => handleUiModeChange('modern_win32')}
                className={`h-full p-4 border-4 text-left transition-all flex flex-col items-center justify-center gap-2 ${uiMode === 'modern_win32' ? 'border-ui-blue bg-ui-blue/5' : 'border-ui-border hover:border-ui-gray'
                  }`}
              >
                <div className="text-[12px] font-bold uppercase text-ui-blue text-center">Modern Win32</div>
                <div className="text-xs text-white/80 text-center uppercase">Soft Shadows & Flat</div>
                {uiMode === 'modern_win32' && <Check size={16} className="text-ui-blue mt-2" />}
              </button>
            </div>
            
            <div className="mt-4 border-2 border-ui-border p-4 bg-black/20">
              <button
                onClick={() => setScanlinesEnabled(!scanlinesEnabled)}
                className={`w-full p-4 border-4 flex items-center justify-between transition-all ${scanlinesEnabled ? 'border-ui-blue bg-ui-blue/5' : 'border-ui-border hover:border-ui-gray'}`}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className={`text-[12px] font-bold uppercase ${scanlinesEnabled ? 'text-ui-blue' : 'text-text-main'}`}>
                    CRT Scanline Overlay
                  </span>
                  <span className="text-[10px] text-ui-gray uppercase">
                    {scanlinesEnabled ? 'Scanlines Enabled' : 'Scanlines Disabled'}
                  </span>
                </div>
                <Check size={16} className={scanlinesEnabled ? 'text-ui-blue opacity-100' : 'opacity-0'} />
              </button>
            </div>

            <div className="mt-6 border-2 border-ui-border p-4 bg-black/20">
              <h4 className="text-xs text-ui-gray uppercase font-bold tracking-widest mb-4">Live Preview</h4>
              <div className={`p-8 border-4 border-ui-border flex flex-col items-center justify-center transition-all min-h-[200px] bg-bg-dark text-text-main font-press-start ui-mode-${uiMode} theme-${theme}`}>
                <div className="geometric-card w-full max-w-sm p-6 text-center shadow-lg">
                  <div className="geometric-border mb-6 p-4 bg-bg-dark/30">
                    <span className="text-[12px] font-bold uppercase text-text-main">Component Preview</span>
                  </div>
                  <button className="geometric-button w-full py-4 text-[12px] font-bold flex items-center justify-center gap-2">
                    <Check size={14} /> Interactive Element
                  </button>
                </div>
              </div>
            </div>
          </section>
          )}

          {/* Card Graphics Section */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Card Graphics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CARD_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCardStyle(s.id)}
                  className={`h-full p-6 border-4 text-left transition-all flex items-center justify-between ${cardStyle === s.id ? 'border-ui-green bg-ui-green/5' : 'border-ui-border hover:border-ui-gray'
                    }`}
                >
                  <div>
                    <div className={`text-[12px] font-bold uppercase mb-1 ${cardStyle === s.id ? 'text-ui-green' : 'text-text-main'}`}>
                      {s.name}
                    </div>
                    <div className="text-xs text-white/80 uppercase">{s.description}</div>
                  </div>
                  {cardStyle === s.id && <Check size={16} className="text-ui-green" />}
                </button>
              ))}
            </div>
          </section>
          )}

          {/* Card Back Pattern Section */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Card Back Pattern</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CARD_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCardBackStyle(s.id)}
                  className={`h-full p-4 border-4 text-left transition-all flex items-center justify-between ${cardBackStyle === s.id ? 'border-ui-orange bg-ui-orange/5' : 'border-ui-border hover:border-ui-gray'
                    }`}
                >
                  <div className={`text-[12px] font-bold uppercase ${cardBackStyle === s.id ? 'text-ui-orange' : 'text-text-main'}`}>
                    {s.name}
                  </div>
                  {cardBackStyle === s.id && <Check size={16} className="text-ui-orange" />}
                </button>
              ))}
            </div>
          </section>
          )}

          {/* Card Back Color Section */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Palette size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Card Back Color</h3>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { id: 'red', label: 'Red', hex: '#dc2626' },
                { id: 'blue', label: 'Blue', hex: '#2563eb' },
                { id: 'green', label: 'Green', hex: '#16a34a' },
                { id: 'yellow', label: 'Yellow', hex: '#eab308' },
                { id: 'orange', label: 'Orange', hex: '#f97316' },
                { id: 'purple', label: 'Purple', hex: '#9333ea' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCardBackColor(c.id)}
                  className={`flex flex-col items-center justify-center p-2 border-2 transition-all ${cardBackColor === c.id ? 'border-white scale-110 shadow-lg' : 'border-ui-border opacity-60 hover:opacity-100'
                    }`}
                >
                  <div className="w-full h-8 border border-black mb-1" style={{ backgroundColor: c.hex }}></div>
                  <span className="text-xs font-bold uppercase">{c.label}</span>
                </button>
              ))}
            </div>
          </section>
          )}

          {/* Card Back Secondary Color Section */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Palette size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Card Pattern Color</h3>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {[
                { id: 'white', label: 'White', hex: '#ffffff' },
                { id: 'black', label: 'Black', hex: '#000000' },
                { id: 'red', label: 'Red', hex: '#dc2626' },
                { id: 'blue', label: 'Blue', hex: '#2563eb' },
                { id: 'green', label: 'Green', hex: '#16a34a' },
                { id: 'yellow', label: 'Yellow', hex: '#eab308' },
                { id: 'orange', label: 'Orange', hex: '#f97316' },
                { id: 'purple', label: 'Purple', hex: '#9333ea' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCardBackSecondaryColor(c.id)}
                  className={`flex flex-col items-center justify-center p-2 border-2 transition-all ${cardBackSecondaryColor === c.id ? 'border-white scale-110 shadow-lg z-10 bg-black/20' : 'border-ui-border opacity-60 hover:opacity-100'
                    }`}
                >
                  <div className="w-full h-8 border border-black mb-1" style={{ backgroundColor: c.hex }}></div>
                  <span className="text-xs font-bold uppercase">{c.label}</span>
                </button>
              ))}
            </div>
          </section>
          )}

          {/* Card Preview Section */}
          {activeTab === 'display' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Card Preview</h3>
            </div>
            <div className="flex justify-center gap-8 p-6 geometric-border bg-black/10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 aspect-[3/4]">
                  <CardComponent
                    card={{ id: 'preview-front', value: 'A', suit: 'spades', is_face_up: true, player_id: 'none' }}
                    index={0}
                    style={cardStyle}
                    backStyle={cardBackStyle}
                    backColor={cardBackColor}
                    backSecondaryColor={cardBackSecondaryColor}
                    forceFaceUp={true}
                  />
                </div>
                <span className="text-xs text-ui-gray uppercase font-bold mt-2">Front</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 aspect-[3/4]">
                  <CardComponent
                    card={{ id: 'preview-back', value: 'A', suit: 'spades', is_face_up: false, player_id: 'none' }}
                    index={1}
                    style={cardStyle}
                    backStyle={cardBackStyle}
                    backColor={cardBackColor}
                    backSecondaryColor={cardBackSecondaryColor}
                    forceFaceUp={false}
                  />
                </div>
                <span className="text-xs text-ui-gray uppercase font-bold mt-2">Back</span>
              </div>
            </div>
          </section>
          )}

          {/* Avatar Section */}
          {activeTab === 'account' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <UserIcon size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Player Icon</h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_LIST.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-12 h-12 flex items-center justify-center border-2 transition-all ${avatar === a ? 'border-ui-yellow bg-ui-yellow/10 text-ui-yellow shadow-[2px_2px_0px_0px_rgba(255,184,0,0.5)]' : 'border-ui-border text-white/70 hover:text-white hover:border-white/50 hover:bg-white/5'
                    }`}
                  title={a}
                >
                  <UserAvatar type={a} size={20} />
                </button>
              ))}
            </div>
          </section>
          )}

          {/* Security Section */}
          {activeTab === 'account' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Key size={14} className="text-ui-gray" />
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Security</h3>
            </div>
          </section>
          )}

          {/* Notifications Section */}
          {activeTab === 'preferences' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-ui-gray text-[14px]">🔔</span>
              <h3 className="text-[12px] text-ui-gray uppercase font-bold tracking-widest">Push Notifications</h3>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-4">
              <button
                onClick={() => setPushGameInvites(!pushGameInvites)}
                className={`w-full p-4 border-4 flex items-center justify-between transition-all ${pushGameInvites ? 'border-ui-blue bg-ui-blue/5' : 'border-ui-border'}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-[12px] font-bold uppercase ${pushGameInvites ? 'text-ui-blue' : 'text-text-main'}`}>
                    Game Invites
                  </span>
                </div>
                <Check size={16} className={pushGameInvites ? 'text-ui-blue opacity-100' : 'opacity-0'} />
              </button>
              
              <button
                onClick={() => setPushTurnReminders(!pushTurnReminders)}
                className={`w-full p-4 border-4 flex items-center justify-between transition-all ${pushTurnReminders ? 'border-ui-green bg-ui-green/5' : 'border-ui-border'}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-[12px] font-bold uppercase ${pushTurnReminders ? 'text-ui-green' : 'text-text-main'}`}>
                    Turn Reminders & Nudges
                  </span>
                </div>
                <Check size={16} className={pushTurnReminders ? 'text-ui-green opacity-100' : 'opacity-0'} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={async () => {
                  const { resetPushSubscription } = await import('../lib/push');
                  const success = await resetPushSubscription(token);
                  alert(success ? "Notifications reset and re-subscribed successfully." : "Failed to reset notifications.");
                }}
                className="w-full py-3 border-2 border-ui-border text-[12px] uppercase font-bold text-ui-gray hover:text-white hover:border-white transition-all"
              >
                Reset Subscription
              </button>
              <button
                onClick={async () => {
                  const { testPushNotification } = await import('../lib/push');
                  const success = await testPushNotification(token);
                  if (!success) alert("Failed to send test notification. Try resetting your subscription.");
                }}
                className="w-full py-3 bg-ui-blue border-2 border-ui-border text-[12px] uppercase font-bold text-white hover:border-ui-yellow transition-all"
              >
                Test Notification
              </button>
            </div>
          </section>
          )}

          {/* Password Change Section */}
          {activeTab === 'account' && (
          <section className={`space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full py-3 border-2 border-ui-border text-[12px] uppercase font-bold text-ui-gray hover:text-white hover:border-white transition-all"
              >
                Change Account Password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="p-4 border-2 border-ui-border bg-white/5 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-ui-gray uppercase font-bold">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[12px] outline-none focus:border-ui-yellow"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-ui-gray uppercase font-bold">New Password (MIN 6)</label>
                  <input
                    type="password"
                    required
                    value={passwords.next}
                    onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                    className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[12px] outline-none focus:border-ui-yellow"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-ui-gray uppercase font-bold">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full p-3 bg-bg-dark border-2 border-ui-border text-[12px] outline-none focus:border-ui-yellow"
                  />
                </div>

                {passError && (
                  <div className="text-xs text-ui-red uppercase font-bold animate-pulse">{passError}</div>
                )}
                {passSuccess && (
                  <div className="text-xs text-ui-green uppercase font-bold">Password updated successfully!</div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-ui-yellow text-bg-dark text-xs font-bold uppercase transition-all disabled:opacity-50"
                  >
                    {saving ? 'UPDATING...' : 'UPDATE PASSWORD'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPassError(null);
                    }}
                    className="flex-1 py-3 border-2 border-ui-gray text-ui-gray text-xs font-bold uppercase"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </section>
          )}

          {/* Danger Zone */}
          {activeTab === 'account' && (
          <section className={`pt-8 border-t-2 border-ui-red/20 space-y-4 ui-mode-${user.ui_mode || 'retro'}`}>
            <div className="text-[12px] text-ui-red uppercase font-bold tracking-widest">Danger Zone</div>

            {!showConfirmReset ? (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-4 border-4 border-ui-red/30 text-ui-red/60 text-xs uppercase font-bold hover:bg-ui-red hover:text-white hover:border-ui-red transition-all shadow-[4px_4px_0px_0px_rgba(220,38,38,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,0.2)]"
              >
                Initiate Hard Reset
              </button>
            ) : (
              <div className="p-4 border-4 border-ui-red bg-ui-red/5 space-y-4 animate-pulse">
                <div className="text-xs text-ui-red font-black uppercase text-center leading-tight">
                  ARE YOU ABSOLUTELY SURE?<br />ALL MATCH DATA WILL BE PERMANENTLY DELETED.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/users/stats/reset`, {
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
                    className="flex-1 py-3 bg-ui-red text-white text-xs uppercase font-bold hover:bg-white hover:text-ui-red transition-all disabled:opacity-50"
                  >
                    {saving ? 'RESETTING...' : 'YES, ERASE EVERYTHING'}
                  </button>
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    disabled={saving}
                    className="flex-1 py-3 border-2 border-ui-gray text-ui-gray text-xs uppercase font-bold hover:bg-ui-gray hover:text-white transition-all disabled:opacity-50"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </section>
          )}
        </div>

        <div className={`p-6 border-t-4 border-ui-border bg-bg-dark flex gap-4 flex-shrink-0 ui-mode-${user.ui_mode || 'retro'}`}>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex-1 geometric-button py-4 text-[12px] uppercase font-bold shadow-[4px_4px_0px_0px_#000]"
          >
            {saving ? 'Saving...' : 'Apply Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-8 border-4 border-ui-border text-[12px] uppercase font-bold hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
