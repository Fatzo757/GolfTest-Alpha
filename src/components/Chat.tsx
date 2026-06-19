import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Clock } from 'lucide-react';
import UserAvatar from './UserAvatar.tsx';
import { soundService } from '../services/soundService';
import { formatMatchTime } from '../lib/timeUtils';
import { User } from '../types';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
}

interface ChatProps {
  gameId: string;
  userId: string;
  user: User;
  token: string;
}

export function Chat({ gameId, userId, user, token }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      if (previousMessagesLengthRef.current > 0) {
        const newMessages = messages.slice(previousMessagesLengthRef.current);
        const hasOthersNew = newMessages.some(m => m.sender_id !== userId);
        if (hasOthersNew && !isOpen) {
          setUnreadCount(c => c + newMessages.filter(m => m.sender_id !== userId).length);
          soundService.playMessage();
        }
      }
      previousMessagesLengthRef.current = messages.length;
    }
  }, [messages, isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const fetchMessages = async () => {
    if (!gameId || !token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          // Token might be expired, but we let other parts handle auth
          return;
        }
        console.warn(`Messages fetch failed: ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      // Don't log "Failed to fetch" as an error to keep console cleaner during restarts
      if (err instanceof Error && err.message === 'Failed to fetch') {
        // Silent
      } else {
        console.error('Failed to fetch messages', err);
      }
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading || !token || cooldown > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/games/${gameId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });
      if (res.status === 429) {
        setCooldown(2);
        return;
      }
      setNewMessage('');
      setCooldown(2);
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setLoading(false);
    }
  };

  const chatContent = (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ui-yellow text-bg-dark rounded-none border-t-4 border-l-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all z-[150]"
      >
        <MessageSquare size={24} />
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-ui-red text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-black animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Slide-out Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-80 bg-bg-dark border-l-4 border-ui-border z-[200] flex flex-col shadow-2xl"
          >
            {/* Chat Header */}
            <div className="p-4 border-b-2 border-ui-border flex justify-between items-center bg-ui-blue/10">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-ui-yellow" />
                <span className="text-[10px] text-ui-gray uppercase tracking-widest font-bold">Game Chat</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-ui-gray hover:text-ui-red transition-colors p-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Feed */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-20 flex-col gap-2">
                  <MessageSquare size={32} />
                  <span className="text-[8px] uppercase tracking-widest">No messages yet</span>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.sender_id === userId ? 20 : -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className={`flex flex-col ${msg.sender_id === userId ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`flex items-center gap-2 mb-1 px-1 ${msg.sender_id === userId ? 'flex-row-reverse' : 'flex-row'}`}>
                         <div className={`w-4 h-4 flex items-center justify-center opacity-60 ${msg.sender_id === userId ? 'text-ui-yellow' : 'text-ui-gray'}`}>
                           <UserAvatar type={msg.sender_avatar} size={12} />
                         </div>
                         <span className="text-[7px] text-ui-gray uppercase">
                           {msg.sender_name}
                         </span>
                      </div>
                      <div
                        className={`max-w-[85%] p-3 text-[11px] leading-tight shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] ${
                          msg.sender_id === userId
                            ? 'bg-ui-yellow text-bg-dark font-medium border-r-4 border-b-4 border-black'
                            : 'bg-ui-blue/20 text-ui-gray border-2 border-ui-border'
                        }`}
                      >
                        {msg.content}
                        <div className={`text-[6px] opacity-40 mt-1 flex items-center justify-end gap-1 ${msg.sender_id === userId ? 'text-bg-dark' : 'text-ui-gray'}`}>
                           <Clock size={8} />
                           {formatMatchTime(msg.created_at, { timeZone: user.time_zone, timeFormat: user.time_format, showDate: !!user.show_date })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 border-t-2 border-ui-border bg-ui-blue/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 bg-bg-dark border-2 border-ui-border p-2 text-xs focus:border-ui-yellow outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !newMessage.trim() || cooldown > 0}
                  className="bg-ui-yellow text-bg-dark p-2 border-2 border-black shrink-0 disabled:opacity-50 relative group"
                >
                  {cooldown > 0 ? (
                    <span className="text-[10px] font-bold">{cooldown}s</span>
                  ) : (
                    <Send size={16} />
                  )}
                  {cooldown > 0 && (
                    <div className="absolute -top-8 right-0 bg-ui-red text-white text-[7px] px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      Wait {cooldown}s
                    </div>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(chatContent, document.body);
}
