import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Lock, Eye, EyeOff, Shield, Database, Trash2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { encryptMessage, decryptMessage } from '../lib/crypto-utils';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  encryptedText: string;
  timestamp: any;
}

export const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomKey, setRoomKey] = useState(sessionStorage.getItem('chat_key') || '');
  const [showKey, setShowKey] = useState(!roomKey);
  const [isLocalOnly, setIsLocalOnly] = useState(localStorage.getItem('local_only') === 'true');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);

      if (isLocalOnly) {
        localStorage.setItem('chat_logs', JSON.stringify(msgs));
      }
    });

    return () => unsubscribe();
  }, [isLocalOnly]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomKey || !auth.currentUser) return;

    try {
      const encrypted = encryptMessage(inputText, roomKey);
      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || auth.currentUser.email,
        encryptedText: encrypted,
        timestamp: serverTimestamp(),
      });
      setInputText('');
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const saveKey = () => {
    sessionStorage.setItem('chat_key', roomKey);
    setShowKey(false);
  };

  const toggleLocalOnly = () => {
    const newVal = !isLocalOnly;
    setIsLocalOnly(newVal);
    localStorage.setItem('local_only', String(newVal));
  };

  const handlePurgeChat = async () => {
    if (!window.confirm("CRITICAL: Purge all encrypted data from the secure channel? This cannot be undone.")) return;
    
    try {
      const q = query(collection(db, 'messages'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Purge failed:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-[#ccc] font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="h-[70px] border-b border-[#2a2e37] px-6 flex items-center justify-between shrink-0 bg-[#08090b]">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-[#00f0ff]" />
          <h1 className="text-white font-bold tracking-[0.2em] uppercase text-[10px]">Secure Channel Matrix</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowKey(true)}
            className="p-2 text-[#444] hover:text-[#00f0ff] transition-colors"
            title="Manage Encryption Key"
          >
            <Lock size={18} />
          </button>
          <button 
            onClick={toggleLocalOnly}
            className={`p-2 transition-colors ${isLocalOnly ? 'text-[#00ff9d]' : 'text-[#444] hover:text-[#00f0ff]'}`}
            title="Toggle Local Storage Logs"
          >
            <Database size={18} />
          </button>
          <button 
            onClick={handlePurgeChat}
            className="p-2 text-[#444] hover:text-red-500 transition-colors"
            title="Purge Channel History"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-6 sm:space-y-10 scrollbar-hide">
        {messages.map((msg) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          const decrypted = decryptMessage(msg.encryptedText, roomKey);

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[9px] sm:text-[10px] text-[#444] uppercase tracking-[0.2em] mb-1 sm:mb-2 font-mono">
                {msg.senderName} • {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className={`max-w-[90%] sm:max-w-[80%] px-4 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm leading-relaxed ${
                isMe ? 'bg-[#00f0ff] text-[#08090b] font-bold shadow-[0_4px_20px_rgba(0,240,255,0.15)]' : 'bg-[#1a1a1a] text-[#eee] border border-[#2a2e37]'
              }`}>
                {decrypted}
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </main>

      {/* Input */}
      <footer className="p-4 sm:p-8 shrink-0 bg-[#08090b] border-t border-[#2a2e37]">
        <form onSubmit={handleSendMessage} className="relative flex gap-2 sm:gap-4 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!roomKey}
            placeholder={roomKey ? "TRANSMIT DATA..." : "INIT KEY..."}
            className="flex-1 bg-transparent border border-[#2a2e37] px-4 sm:px-6 py-3 sm:py-4 focus:outline-none focus:border-[#00f0ff] transition-all text-xs sm:text-sm uppercase tracking-wider font-mono text-white placeholder:text-[#333] min-w-0"
          />
          <button 
            type="submit"
            disabled={!inputText.trim() || !roomKey}
            className="px-6 sm:px-8 bg-[#00f0ff] text-[#08090b] disabled:bg-[#1a1a1a] disabled:text-[#333] transition-all font-black uppercase text-[10px] tracking-widest shrink-0"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>

      {/* Key Modal */}
      <AnimatePresence>
        {showKey && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#08090b]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#12141a] border border-[#2a2e37] p-6 sm:p-10 max-w-md w-full rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-[#00f0ff] mb-6 sm:mb-8 mx-auto" />
              <h2 className="text-white text-base sm:text-lg font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-center mb-2 sm:mb-3">Protocol Initialized</h2>
              <p className="text-[#8a8f98] text-[9px] sm:text-[10px] text-center mb-8 sm:mb-10 leading-relaxed uppercase tracking-wider font-bold">
                Enter your shared matrix key. This key is processed locally and never leaves your secure node.
              </p>
              
              <div className="relative mb-6 sm:mb-8">
                <input 
                  type="password"
                  value={roomKey}
                  onChange={(e) => setRoomKey(e.target.value)}
                  placeholder="ENCRYPTION KEY"
                  className="w-full bg-black border border-[#2a2e37] px-4 sm:px-6 py-3 sm:py-4 rounded-sm text-white focus:outline-none focus:border-[#00f0ff] font-mono text-center tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-base"
                />
              </div>

              <button 
                onClick={saveKey}
                disabled={!roomKey}
                className="w-full bg-[#00f0ff] text-[#08090b] py-4 sm:py-5 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] disabled:bg-[#1a1a1a] disabled:text-[#333] transition-all"
              >
                Engage Channel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
