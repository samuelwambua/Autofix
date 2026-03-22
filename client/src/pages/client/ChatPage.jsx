import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Send, MessageSquare, Phone, Search,
  Wrench, Check, CheckCheck, Mic,
} from 'lucide-react';
import { io } from 'socket.io-client';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';

const SOCKET_URL  = 'http://localhost:5000';
const QUICK_REPLIES = [
  'Any update on my vehicle?',
  'How much will it cost?',
  'Is my car ready?',
  'When will work begin?',
  'Can I get a quote?',
];

const fetchConversations = (role) =>
  axiosInstance.get(
    role === 'client' ? '/chat/conversations/my' : '/chat/conversations/garage'
  ).then(r => r.data);

const fetchMessages = (convId) =>
  axiosInstance.get(`/chat/conversations/${convId}/messages`).then(r => r.data);

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
  const d   = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
};

const ChatPage = () => {
  const { user }    = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [search, setSearch]               = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const [otherTyping, setOtherTyping]     = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const socketRef   = useRef(null);
  const messagesEnd = useRef(null);
  const typingTimer = useRef(null);

  const isClient = user?.role === 'client';

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations', user?.role],
    queryFn: () => fetchConversations(user?.role),
    refetchInterval: 10000,
  });

  const conversations = convsData?.data || [];

  // Auto-select conversation from URL param
  useEffect(() => {
    const garageId = searchParams.get('garage_id');
    if (garageId && isClient) {
      axiosInstance.post('/chat/conversations', { garage_id: garageId })
        .then(r => setActiveConv(r.data.data))
        .catch(console.error);
    }
  }, [searchParams]);

  // Socket.io connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current.emit('register', user?.id);

    socketRef.current.on('new_message', (message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    });

    socketRef.current.on('user_typing', () => setOtherTyping(true));
    socketRef.current.on('user_stop_typing', () => setOtherTyping(false));

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConv) return;

    socketRef.current?.emit('leave_conversation', activeConv.id);
    socketRef.current?.emit('join_conversation', activeConv.id);

    setLoadingMsgs(true);
    fetchMessages(activeConv.id)
      .then(r => {
        setMessages(r.data || []);
        setTimeout(scrollToBottom, 100);
      })
      .finally(() => setLoadingMsgs(false));

    queryClient.invalidateQueries(['conversations']);
  }, [activeConv?.id]);

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!input.trim() || !activeConv) return;

    const sender_type = isClient ? 'client' : 'staff';
    socketRef.current?.emit('send_message', {
      conversation_id: activeConv.id,
      sender_id:       user.id,
      sender_type,
      content:         input.trim(),
      message_type:    'text',
    });

    setInput('');
    setShowQuickReplies(false);
    stopTyping();
  };

  const handleTyping = (val) => {
    setInput(val);
    if (!socketRef.current || !activeConv) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', {
        conversation_id: activeConv.id,
        sender_id:       user.id,
        sender_type:     isClient ? 'client' : 'staff',
      });
    }

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    socketRef.current?.emit('stop_typing', {
      conversation_id: activeConv?.id,
      sender_id:       user?.id,
    });
  };

  const filteredConvs = conversations.filter(c => {
    const name = isClient ? c.garage_name : c.client_name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const getConvName = (c) => isClient ? c.garage_name : c.client_name;
  const getConvSub  = (c) => isClient ? c.garage_phone : c.client_phone;
  const unreadCount = (c) => isClient ? c.client_unread : c.garage_unread;

  return (
    <PageWrapper title="Messages" subtitle="Chat directly with your garage or clients.">
      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">

        {/* ── Conversations List ──────────────────────── */}
        <div className={`flex flex-col w-full lg:w-80 flex-shrink-0
          ${activeConv ? 'hidden lg:flex' : 'flex'}`}>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search conversations..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl
                pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>

          <GlassCard className="flex-1 overflow-y-auto p-0">
            {convsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="sm" text="Loading..." />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 px-4 text-center">
                <MessageSquare size={28} className="text-white/20" />
                <p className="text-white/30 text-sm">No conversations yet.</p>
              </div>
            ) : (
              filteredConvs.map((c) => {
                const unread  = unreadCount(c);
                const isActive = activeConv?.id === c.id;
                return (
                  <button key={c.id} onClick={() => setActiveConv(c)}
                    className={`w-full flex items-center gap-3 p-4 text-left
                      transition-all border-b border-white/5 hover:bg-white/10
                      ${isActive ? 'bg-blue-500/20' : ''}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
                      flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {getConvName(c)?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-semibold text-sm truncate">{getConvName(c)}</p>
                        {c.last_message_at && (
                          <p className="text-white/30 text-xs flex-shrink-0 ml-1">
                            {formatTime(c.last_message_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-white/40 text-xs truncate">
                          {c.last_message || 'No messages yet'}
                        </p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 ml-1 w-5 h-5 rounded-full
                            bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </GlassCard>
        </div>

        {/* ── Chat Window ─────────────────────────────── */}
        {activeConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="flex items-center justify-between gap-3 mb-3
              bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveConv(null)}
                  className="lg:hidden p-1.5 text-white/50 hover:text-white transition-colors">
                  ←
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
                  flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {getConvName(activeConv)?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{getConvName(activeConv)}</p>
                  <p className="text-white/40 text-xs">{getConvSub(activeConv)}</p>
                </div>
              </div>
              {/* Call button */}
              {getConvSub(activeConv) && (
                <a href={`tel:${getConvSub(activeConv)}`}
                  className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30
                    text-emerald-400 text-xs font-semibold rounded-xl px-3 py-2
                    border border-emerald-500/30 transition-all">
                  <Phone size={13} /> Call
                </a>
              )}
            </div>

            {/* Messages */}
            <GlassCard className="flex-1 overflow-y-auto p-4 space-y-3 mb-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" text="Loading messages..." />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <MessageSquare size={28} className="text-white/20" />
                  <p className="text-white/30 text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === user?.id;
                    const showDate = i === 0 ||
                      formatDate(messages[i-1]?.created_at) !== formatDate(msg.created_at);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center justify-center my-2">
                            <span className="text-white/25 text-xs bg-white/5 px-3 py-1 rounded-full">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm
                              ${isMine
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-br-md'
                                : 'bg-white/10 text-white/90 rounded-bl-md border border-white/10'
                              }`}>
                              {msg.content}
                            </div>
                            <div className={`flex items-center gap-1 mt-1
                              ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-white/25 text-xs">{formatTime(msg.created_at)}</span>
                              {isMine && (
                                msg.is_read
                                  ? <CheckCheck size={12} className="text-blue-400" />
                                  : <Check size={12} className="text-white/30" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {otherTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-md
                        px-4 py-2.5 flex items-center gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                            style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEnd} />
                </>
              )}
            </GlassCard>

            {/* Quick Replies */}
            {showQuickReplies && isClient && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                {QUICK_REPLIES.map((reply) => (
                  <button key={reply}
                    onClick={() => { setInput(reply); setShowQuickReplies(false); }}
                    className="flex-shrink-0 text-xs bg-blue-500/20 hover:bg-blue-500/30
                      text-blue-300 px-3 py-1.5 rounded-full border border-blue-500/30
                      transition-all whitespace-nowrap">
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2">
              {isClient && (
                <button onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={`p-2.5 rounded-xl border transition-all flex-shrink-0
                    ${showQuickReplies
                      ? 'bg-blue-500/30 border-blue-500/40 text-blue-300'
                      : 'bg-white/10 border-white/20 text-white/40 hover:text-white'
                    }`}>
                  <Wrench size={16} />
                </button>
              )}
              <div className="flex-1 flex items-center gap-2 bg-white/10 border border-white/20
                rounded-2xl px-4 py-2.5">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1 bg-transparent text-white placeholder-white/30
                    text-sm focus:outline-none"
                />
              </div>
              <button onClick={handleSend} disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
                  hover:from-blue-600 hover:to-indigo-600 text-white transition-all
                  disabled:opacity-30 flex-shrink-0 shadow-lg shadow-blue-500/30">
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10
                flex items-center justify-center mx-auto">
                <MessageSquare size={28} className="text-white/20" />
              </div>
              <p className="text-white/40 text-sm">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ChatPage;