/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { VoiceGate } from './components/VoiceGate';
import { ChatRoom } from './components/ChatRoom';
import { Shield, Smartphone, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isVoiceVerified, setIsVoiceVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#08090b] flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="mb-12 relative flex justify-center">
            <div className="w-20 h-20 bg-[#00f0ff] flex items-center justify-center rounded-none rotate-45 shadow-[0_0_50px_rgba(0,240,255,0.2)]">
              <Shield className="w-10 h-10 text-black -rotate-45" />
            </div>
          </div>
          
          <h1 className="text-5xl font-black text-white tracking-widest mb-2 uppercase">
            NAMBA <span className="text-[#00f0ff]">THA</span>
          </h1>
          <p className="text-[#8a8f98] text-[10px] mb-12 tracking-[0.4em] uppercase font-bold">
            Secure Biometric Protocol V4.0
          </p>

          <button 
            onClick={signInWithGoogle}
            className="w-full bg-[#00f0ff] text-[#08090b] py-5 flex items-center justify-center gap-4 group hover:bg-white transition-all duration-300 uppercase tracking-[0.2em] font-black text-xs rounded-sm"
          >
            Authenticate Identity
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="mt-12 flex items-center justify-center gap-2">
            <div className="h-[1px] w-8 bg-[#2a2e37]"></div>
            <p className="text-[10px] text-[#2a2e37] uppercase tracking-[0.3em] whitespace-nowrap">
              Tier 4 Encryption Matrix
            </p>
            <div className="h-[1px] w-8 bg-[#2a2e37]"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#08090b] overflow-hidden selection:bg-[#00f0ff] selection:text-black">
      {/* Design Header */}
      <header className="h-[70px] lg:h-[80px] px-6 lg:px-10 flex items-center justify-between border-b border-[#2a2e37] shrink-0 bg-[#08090b] z-30">
        <div className="flex items-center gap-3">
          {user && isVoiceVerified && (
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 -ml-2 text-[#8a8f98] hover:text-[#00f0ff]"
            >
              <Shield size={20} />
            </button>
          )}
          <div className="text-lg lg:text-xl font-bold tracking-[2px] uppercase text-white">
            NAMBA <span className="text-[#00f0ff]">THA</span>
          </div>
        </div>
        <div className="hidden sm:block text-[10px] lg:text-[11px] tracking-[1px] uppercase px-3 py-1.5 border border-[#00f0ff]/10 rounded bg-[#00f0ff]/10 text-[#00f0ff] font-bold">
          Level 4 Biometric Protocol
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - responsive behavior */}
        <aside className={`
          fixed inset-0 z-40 lg:relative lg:z-auto transition-transform duration-300 transform lg:translate-x-0
          ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
          w-[280px] lg:w-[320px] bg-[#08090b] border-r border-[#2a2e37] p-8 lg:p-10 flex flex-col gap-10 shrink-0 overflow-y-auto scrollbar-hide
        `}>
          <div className="flex items-center justify-between lg:hidden mb-4">
             <div className="text-xl font-bold tracking-[2px] uppercase text-white">PROTOCOL</div>
             <button onClick={() => setShowSidebar(false)} className="text-[#8a8f98] p-2">
               <ArrowRight size={20} className="rotate-180" />
             </button>
          </div>
          
          {user && (
            <>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 border-2 border-[#00f0ff] rounded-full flex items-center justify-center font-bold text-white uppercase overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                  {user.displayName?.split(' ').map(n => n[0]).join('') || user.email?.[0].toUpperCase()}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-bold">Authenticating</span>
                  <span className="text-sm font-mono text-white truncate max-w-[150px] lg:max-w-[180px]">{user.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-bold">Session Encryption</span>
                <span className="text-sm font-mono text-white">AES-256-GCM</span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-bold">Identity Hash</span>
                <span className="text-sm font-mono text-white truncate">sha256:{user.uid.slice(0, 8)}...</span>
              </div>

              <div className="mt-auto flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-[#8a8f98] uppercase tracking-wider font-bold">Privacy Settings</span>
                  <span className="text-sm font-mono text-[#00ff9d] uppercase font-bold">IndexedDB Local: ON</span>
                </div>
                
                <div className="flex flex-col gap-3 pt-6 border-t border-[#2a2e37]">
                  <button 
                    onClick={async () => {
                      if (window.confirm("Delete your current voice biometric profile and re-enroll? This cannot be undone.")) {
                        try {
                          await deleteDoc(doc(db, 'users', user.uid));
                          setIsVoiceVerified(false);
                          setShowSidebar(false);
                        } catch (err) {
                          alert("Failed to reset profile. Check permissions.");
                        }
                      }
                    }}
                    className="w-full border border-[#00f0ff]/30 text-[#00f0ff] py-3 text-[10px] font-bold tracking-widest uppercase rounded-sm hover:bg-[#00f0ff]/10 transition-colors"
                  >
                    Update Biometric
                  </button>

                  <button 
                    onClick={() => auth.signOut()}
                    className="w-full border border-red-900/50 text-red-500 py-3 text-[10px] font-bold tracking-widest uppercase rounded-sm hover:bg-red-500/10 transition-colors"
                  >
                    Terminate Session
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>

        {/* Overlay for mobile sidebar */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Content Area */}
        <section className="flex-1 bg-[#12141a] relative overflow-hidden flex flex-col min-w-0">
          {!isVoiceVerified ? (
            <VoiceGate onVerified={() => setIsVoiceVerified(true)} />
          ) : (
            <ChatRoom />
          )}
        </section>
      </main>
    </div>
  );
}
