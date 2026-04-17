import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, ShieldCheck, ShieldAlert, Loader2, UserCheck, Shield } from 'lucide-react';
import { voiceExtractor } from '../lib/audio-utils';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface VoiceGateProps {
  onVerified: () => void;
}

export const VoiceGate: React.FC<VoiceGateProps> = ({ onVerified }) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'verifying' | 'enrolling' | 'failed' | 'success'>('idle');
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!auth.currentUser) return;
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data().voiceSignature) {
        setIsEnrolled(true);
      } else {
        setIsEnrolled(false);
      }
    };
    checkEnrollment();
  }, []);

  const handleStartCapture = async () => {
    try {
      setError(null);
      setStatus('recording');
      await voiceExtractor.startRecording();
      
      // Auto stop after 3 seconds
      setTimeout(async () => {
        const signature = voiceExtractor.stopRecording();
        if (isEnrolled) {
          await verifyVoice(signature);
        } else {
          await enrollVoice(signature);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Microphone access denied");
      setStatus('failed');
    }
  };

  const enrollVoice = async (signature: number[]) => {
    if (!auth.currentUser) return;
    setStatus('verifying');
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        voiceSignature: signature,
        isVoiceEnrolled: true,
        createdAt: new Date().toISOString()
      }, { merge: true });
      setIsEnrolled(true);
      setStatus('success');
      setTimeout(onVerified, 1500);
    } catch (err) {
      setError("Failed to save voice profile");
      setStatus('failed');
    }
  };

  const verifyVoice = async (signature: number[]) => {
    if (!auth.currentUser) return;
    setStatus('verifying');
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const storedSignature = userDoc.data()?.voiceSignature;

      const response = await fetch('/api/verify-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordedMFCC: signature, storedMFCC: storedSignature }),
      });

      const result = await response.json();
      setSimilarity(result.similarity);

      if (result.isMatch) {
        setStatus('success');
        setTimeout(onVerified, 1500);
      } else {
        setStatus('failed');
        setError(`Voice mismatch (Similarity: ${(result.similarity * 100).toFixed(1)}%)`);
      }
    } catch (err) {
      setError("Verification service error");
      setStatus('failed');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
      {/* Design Background Elements */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute w-[320px] h-[320px] border border-[#00f0ff]/10 rounded-full pointer-events-none" 
      />
      
      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full text-center">
        {/* Biometric Ring */}
        <div className="w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] rounded-full border-2 border-[#2a2e37] flex items-center justify-center relative mb-8 sm:mb-12">
          <div className="flex items-center gap-1 h-12">
            {[20, 45, 30, 60, 50, 35, 25].map((h, i) => (
              <motion.div
                key={i}
                animate={status === 'recording' ? { height: [h, h * 1.5, h * 0.5, h] } : { height: h }}
                transition={status === 'recording' ? { duration: 0.5, repeat: Infinity, delay: i * 0.1 } : {}}
                className={`w-0.5 sm:w-1 rounded-full ${i === 3 ? 'bg-[#00f0ff] shadow-[0_0_15px_#00f0ff]' : 'bg-[#00f0ff]'}`}
                style={{ height: h * (window.innerWidth < 640 ? 0.7 : 1) }}
              />
            ))}
          </div>
          
          {/* Status Overlay icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
            {status === 'verifying' ? <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 animate-spin" /> : <Mic className="w-12 h-12 sm:w-16 sm:h-16" />}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-light text-white mb-3 tracking-tight">
          {isEnrolled === false ? "Record Voice Signature" : "Biometric Match"}
        </h1>
        <p className="text-[#8a8f98] text-xs sm:text-sm mb-8 sm:mb-12 max-w-sm px-4 min-h-[40px]">
          {isEnrolled === false 
            ? "Record your voice passphrase to create your unique identity fingerprint."
            : "Verify identity through frequency vector comparison."}
        </p>

        <div className="flex gap-4 mb-8 sm:mb-12">
          {(status === 'idle' || status === 'failed') && (
            <button
              onClick={handleStartCapture}
              className="bg-[#00f0ff] text-[#08090b] px-6 sm:px-10 py-3 sm:py-3.5 rounded-sm font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:bg-white transition-all shadow-[0_0_30px_rgba(0,240,255,0.15)]"
            >
              {status === 'failed' ? "Retry Scan" : "Initialize Scan"}
            </button>
          )}
          {status === 'recording' && (
            <div className="bg-[#00f0ff]/10 text-[#00f0ff] px-6 sm:px-10 py-3 sm:py-3.5 rounded-sm font-bold uppercase tracking-widest text-[10px] sm:text-xs border border-[#00f0ff]/20 animate-pulse">
              Recording...
            </div>
          )}
          {status === 'verifying' && (
            <div className="bg-white/5 text-white px-6 sm:px-10 py-3 sm:py-3.5 rounded-sm font-bold uppercase tracking-widest text-[10px] sm:text-xs border border-white/10 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Analyzing MFCC
            </div>
          )}
          {status === 'success' && (
            <div className="bg-[#00ff9d]/10 text-[#00ff9d] px-6 sm:px-10 py-3 sm:py-3.5 rounded-sm font-bold uppercase tracking-widest text-[10px] sm:text-xs border border-[#00ff9d]/20">
              Identity Confirmed
            </div>
          )}
        </div>

        {/* MFCC Grid Visualizer */}
        <div className="grid grid-cols-13 gap-2 w-full max-w-[400px]">
          {Array.from({ length: 13 }).map((_, i) => (
            <motion.div
              key={i}
              animate={status === 'verifying' || status === 'recording' ? { opacity: [0.1, 1, 0.1] } : {}}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.05 }}
              className={`h-8 border border-[#00f0ff]/20 transition-colors ${
                status === 'success' ? 'bg-[#00ff9d]' : 
                status === 'verifying' ? 'bg-[#00f0ff]' : 
                'bg-[#00f0ff]/10'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-8 text-red-500 text-[10px] uppercase font-bold tracking-widest bg-red-500/5 px-4 py-2 border border-red-500/10">
            {error}
          </p>
        )}

        <div className="absolute bottom-10 right-10 flex items-center gap-2 text-[#00ff9d] text-xs font-bold tracking-wider">
          <Shield size={14} />
          END-TO-END ENCRYPTED
        </div>
      </div>
    </div>
  );
};
