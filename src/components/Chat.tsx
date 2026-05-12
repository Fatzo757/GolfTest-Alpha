import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Clock } from 'lucide-react';
import UserAvatar from './UserAvatar.tsx';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!gameId || !token) return;
    try {
      const res = await fetch(`/api/games/${gameId}/messages`, {
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
    if (!newMessage.trim() || loading || !token) return;

    setLoading(true);
    try {
      await fetch(`/api/games/${gameId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ui-yellow text-bg-dark rounded-none border-t-4 border-l-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all z-40"
      >
        <MessageSquare size={24} />
      </button>

      {/* Slide-out Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-80 bg-bg-dark border-l-4 border-ui-border z-50 flex flex-col shadow-2xl"
          >
            {/* Chat Header */}
            <div className="p-4 border-b-2 border-ui-border flex justify-between items-center bg-ui-blue/10">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-ui-yellow" />
                <span className="text-[10px] text-ui-gray uppercase tracking-widest font-bold">Game Chat</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-ui-gray hover:text-ui-red transition-colors"
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
                  className="flex-1 bg-bg-dark border-2 border-ui-border p-2 text-xs focus:border-ui-yellow outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !newMessage.trim()}
                  className="bg-ui-yellow text-bg-dark p-2 border-2 border-black disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
