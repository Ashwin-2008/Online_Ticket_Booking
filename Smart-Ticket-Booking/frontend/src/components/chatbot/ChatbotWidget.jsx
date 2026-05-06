import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { MessageCircle, X, Send, Bot, Mic, MicOff } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const WELCOME = {
  id: 1,
  role: 'bot',
  text: 'Hi! I am SmartBot. I can help you book tickets. Try: "Book 2 bus tickets from Salem to Chennai tomorrow".',
  time: new Date(),
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const activeStorageKeyRef = useRef('');
  const skipNextSaveRef = useRef(false);
  const { user, token } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const chatOwnerKey = getChatOwnerKey(user, token);
  const historyKey = `smartbot_messages_${chatOwnerKey}`;
  const sessionKey = `smartbot_session_id_${chatOwnerKey}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    activeStorageKeyRef.current = '';
    skipNextSaveRef.current = true;
    setMessages(loadMessages(historyKey));
    setSessionId(getOrCreateSessionId(sessionKey));
    setInput('');
    setLoading(false);
    activeStorageKeyRef.current = historyKey;
  }, [historyKey, sessionKey]);

  useEffect(() => {
    if (activeStorageKeyRef.current !== historyKey) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    localStorage.setItem(historyKey, JSON.stringify(messages.map((msg) => ({
      ...msg,
      time: msg.time instanceof Date ? msg.time.toISOString() : msg.time,
    }))));
  }, [historyKey, messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-IN';
      recognitionRef.current.onresult = (e) => {
        setInput(e.results[0][0].transcript);
        setListening(false);
      };
      recognitionRef.current.onend = () => setListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const addMessage = (role, text, services = [], entities = {}) => {
    setMessages((prev) => [...prev, { id: Date.now(), role, text, services, entities, time: new Date() }]);
  };

  const sendMessage = async (text = input) => {
    if (!text.trim() || !sessionId) return;
    addMessage('user', text);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', { message: text, sessionId });
      addMessage('bot', data.response, data.services || [], data.entities || {});
      if (data.action === 'navigate_booking' && data.bookingUrl) {
        setTimeout(() => {
          navigate(data.bookingUrl);
          setOpen(false);
        }, 700);
      } else if (data.action === 'login_required') {
        setTimeout(() => {
          navigate('/login');
          setOpen(false);
        }, 900);
      } else if (data.action === 'navigate_bookings') {
        setTimeout(() => {
          navigate('/bookings');
          setOpen(false);
        }, 900);
      }
    } catch {
      addMessage('bot', 'Sorry, I encountered an error. Please try again.');
    }

    setLoading(false);
  };

  const quickReplies = [
    'Book bus from Salem to Chennai tomorrow',
    'Show movies today',
    'Book Kalki movie tomorrow',
    'Find flights to Mumbai',
    'Events this weekend',
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all hover:scale-110 active:scale-95"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-96 h-[560px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-100 animate-slide-up overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-blue-500 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">SmartBot</h3>
              <p className="text-xs text-blue-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
                AI-Powered Booking Assistant
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className="max-w-[85%]">
                  {msg.role === 'bot' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-primary-500" />
                      <span className="text-xs text-gray-400">SmartBot</span>
                    </div>
                  )}
                  <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                  </div>

                  {msg.services?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.services.map((service, index) => (
                        <div key={service._id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                          <p className="font-semibold text-sm text-gray-900">{index + 1}. {service.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatServicePlace(service)}
                            {format(new Date(service.departureTime), 'dd MMM, hh:mm a')}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-primary-600">Rs. {service.price}</span>
                            <button
                              onClick={() => {
                                const serviceId = getServiceId(service);
                                if (!serviceId) {
                                  toast.error('I could not open this service. Please search again.');
                                  return;
                                }
                                const bookingPath = `/book/${serviceId}`;
                                const state = {
                                  fromChatbot: true,
                                  seats: Number(msg.entities?.seats || 1),
                                  serviceType: service.serviceType,
                                };
                                user ? navigate(bookingPath, { state }) : navigate('/login', { state: { redirectTo: bookingPath, bookingState: state } });
                                setOpen(false);
                              }}
                              className="text-xs bg-primary-600 text-white px-3 py-1 rounded-full hover:bg-primary-700 transition-colors"
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-300 mt-1 text-right">{format(msg.time, 'hh:mm a')}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="chat-bubble-bot">
                  <div className="flex gap-1 items-center py-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-100 bg-white">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  className="text-xs whitespace-nowrap bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors flex-shrink-0"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Type or speak your request..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              {recognitionRef.current && (
                <button
                  onClick={toggleVoice}
                  className={`p-2.5 rounded-xl transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatServicePlace(service) {
  if (service.serviceType === 'movie' || service.serviceType === 'event') {
    return service.venue ? `${service.venue} | ` : '';
  }
  if (service.source && service.destination) {
    return `${service.source} to ${service.destination} | `;
  }
  if (service.source) return `${service.source} | `;
  if (service.destination) return `${service.destination} | `;
  return '';
}

function getServiceId(service) {
  return service?._id || service?.id;
}

function getChatOwnerKey(user, token) {
  if (user?._id) return `user_${user._id}`;
  if (user?.email) return `user_${user.email}`;
  return token ? 'loading_user' : 'guest';
}

function getOrCreateSessionId(key) {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(key, value);
  return value;
}

function loadMessages(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(saved) || saved.length === 0) return [freshWelcome()];
    return saved.map((msg) => ({ ...msg, time: msg.time ? new Date(msg.time) : new Date() }));
  } catch {
    return [freshWelcome()];
  }
}

function freshWelcome() {
  return { ...WELCOME, id: Date.now(), time: new Date() };
}
