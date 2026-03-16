/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, missingSupabaseEnvVars } from './lib/supabase';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

import {
  Monitor,
  Shield,
  Terminal,
  Users,
  TrendingUp,
  Presentation,
  Handshake,
  BookOpen,
  CheckCircle,
  Zap,
  Layers,
  ArrowRight,
  ChevronRight,
  Search,
  MessageSquare,
  Command,
  Option,
  Menu,
  X,
  Loader2
} from 'lucide-react';

// --- Components ---

const Navbar = ({ onDownloadClick }: { onDownloadClick: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 w-full z-50 px-6 py-4">
      <nav className={`max-w-7xl mx-auto flex items-center justify-between glass rounded-2xl px-6 py-3 transition-all ${isScrolled ? 'bg-charcoal/80' : ''}`}>
        <div className="flex items-center gap-1 group cursor-pointer">
          <span className="text-2xl font-bold tracking-tighter font-display">
            h<span className="relative">i<span className="absolute -top-1 left-0 w-1.5 h-1.5 bg-mint rounded-full animate-mint-blink"></span></span>ntio
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-400">
          <a className="hover:text-mint transition-colors" href="#use-cases">Use Cases</a>
          <a className="hover:text-mint transition-colors" href="#how-it-works">How it Works</a>
          <a className="hover:text-mint transition-colors" href="#shortcuts-help">Shortcuts</a>
          <a className="hover:text-mint transition-colors" href="#pricing">Pricing</a>
          <a className="hover:text-mint transition-colors" href="#faq">FAQ</a>
        </div>

        <div className="hidden md:block">
          <button
            onClick={onDownloadClick}
            className="bg-white/5 border border-white/10 hover:border-mint/50 px-5 py-2 rounded-full text-sm font-semibold transition-all glow-hover"
          >
            Download Free
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-gray-400 hover:text-mint transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-24 left-6 right-6 glass rounded-2xl p-6 z-40 border border-white/10"
          >
            <div className="flex flex-col space-y-4 text-center">
              <a className="text-lg font-medium text-gray-300 hover:text-mint" href="#use-cases" onClick={() => setIsMobileMenuOpen(false)}>Use Cases</a>
              <a className="text-lg font-medium text-gray-300 hover:text-mint" href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>How it Works</a>
              <a className="text-lg font-medium text-gray-300 hover:text-mint" href="#shortcuts-help" onClick={() => setIsMobileMenuOpen(false)}>Shortcuts</a>
              <a className="text-lg font-medium text-gray-300 hover:text-mint" href="#pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</a>
              <a className="text-lg font-medium text-gray-300 hover:text-mint" href="#faq" onClick={() => setIsMobileMenuOpen(false)}>FAQ</a>
              <button
                onClick={() => {
                  onDownloadClick();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 bg-mint text-charcoal font-bold rounded-xl mt-4"
              >
                Download Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Hero = ({
  onDownloadClick,
  onMacDownloadClick,
}: {
  onDownloadClick: () => void;
  onMacDownloadClick: () => void;
}) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden">
      <div className="mesh-gradient"></div>
      <div className="scanline"></div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-full h-full flex items-center justify-center opacity-40">
          <svg className="w-full max-w-4xl" fill="none" height="200" viewBox="0 0 1000 200" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100C50 100 100 20 150 100C200 180 250 100 300 100C350 100 400 50 450 100C500 150 550 80 600 100C650 120 700 100 750 100C800 100 850 140 900 100C950 60 1000 100 1050 100" stroke="#00FFCC" strokeOpacity="0.2" strokeWidth="1"></path>
            <path d="M0 100C50 100 100 140 150 100C200 60 250 100 300 100C350 100 400 150 450 100C500 50 550 120 600 100C650 80 700 100 750 100C800 100 850 20 900 100C950 180 1000 100 1050 100" stroke="#00FFCC" strokeOpacity="0.1" strokeWidth="1"></path>
          </svg>
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/5 mb-8"
        >
          <span className="w-2 h-2 bg-mint rounded-full animate-pulse"></span>
          <span className="text-xs font-medium tracking-wide text-gray-300 uppercase">Now live on Mac & Windows</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold leading-[1.1] mb-6 tracking-tight"
        >
          The invisible overlay <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-mint to-white/60">that wins interviews.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed"
        >
          hintio captures your screen and audio in real time — and whispers the perfect answer before you even pause.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <button
            onClick={onMacDownloadClick}
            className="w-full sm:w-auto px-8 py-4 bg-mint text-charcoal font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,204,0.3)]"
          >
            Download for Mac
          </button>
          <button
            onClick={onDownloadClick}
            className="w-full sm:w-auto px-8 py-4 bg-transparent border border-mint/40 text-mint font-bold rounded-xl hover:bg-mint/10 transition-all flex items-center justify-center gap-2"
          >
            Download for Windows
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mb-12 text-center"
        >
          <a
            href="/help"
            className="text-mint font-semibold underline underline-offset-4 hover:text-white transition-colors"
          >
            How to use
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-gray-500 text-sm font-medium"
        >
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
            <span>Works on Zoom</span>
          </div>
          <span className="text-white/10 hidden sm:inline">·</span>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
            <span>Google Meet</span>
          </div>
          <span className="text-white/10 hidden sm:inline">·</span>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
            <span>Teams</span>
          </div>
          <span className="text-white/10 hidden sm:inline">·</span>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
            <span>Phone calls</span>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-8 items-center">
        <div className="flex items-center gap-3 text-xs tracking-widest text-gray-500 uppercase font-mono">
          <div className="flex gap-1">
            <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded">Ctrl</kbd>
            <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded">\</kbd>
          </div>
          <span>to hide</span>
        </div>
        <div className="w-px h-4 bg-white/10"></div>
        <div className="flex items-center gap-3 text-xs tracking-widest text-gray-500 uppercase font-mono">
          <div className="flex gap-1">
            <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded">Ctrl</kbd>
            <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded">Enter</kbd>
          </div>
          <span>next answer</span>
        </div>
      </div>
    </section>
  );
};

const UseCases = ({ onDownloadClick }: { onDownloadClick: () => void }) => {
  return (
    <section id="use-cases" className="relative z-10 mx-auto w-full max-w-7xl px-6 py-32 lg:px-20">
      <div className="mb-16 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-mint">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint"></span>
          </span>
          Operational Intelligence
        </div>
        <h2 className="text-gradient mb-6 text-5xl font-black leading-tight tracking-tight md:text-6xl font-display">
          Built for every <br />high-stakes moment.
        </h2>
        <p className="text-lg leading-relaxed text-slate-400">
          Switch profiles in one click — hintio adapts its AI to your context. Invisible, real-time, and perfectly synced with your conversation flow.
        </p>
      </div>

      <div className="flex w-full overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-6 pb-8 md:pb-0 -mx-6 px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Interview Card */}
        <div className="shrink-0 w-[85vw] md:w-auto snap-center glass-effect group relative flex flex-col justify-between overflow-hidden rounded-xl p-6 md:p-8 md:col-span-2">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mint/10 blur-[80px]"></div>
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 text-mint">
              <Users size={24} />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">Interviews</h3>
            <p className="mb-8 max-w-md text-slate-400">Real-time answers for technical and behavioral rounds. Stay calm while we source the best responses.</p>

            <div className="rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-sm">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] uppercase tracking-widest text-mint">Live Hint Overlay</span>
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-500/50"></div>
                  <div className="h-2 w-2 rounded-full bg-yellow-500/50"></div>
                  <div className="h-2 w-2 rounded-full bg-green-500/50"></div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-mint">System: Question detected. Preparing STAR response...</p>
                <p className="text-slate-300 leading-relaxed italic">"Use the STAR method — Situation, Task, Action, Result. Start with the context of your last project at TechCorp..."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Card */}
        <div className="shrink-0 w-[85vw] md:w-auto snap-center glass-effect group relative flex flex-col justify-between overflow-hidden rounded-xl p-6 md:p-8 lg:col-span-1">
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 text-mint">
              <TrendingUp size={24} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Sales</h3>
            <p className="text-sm text-slate-400">Live phrasing and objection handling during high-pressure closing calls.</p>
          </div>
          <div className="mt-8 flex justify-end">
            <TrendingUp size={64} className="text-mint/10 group-hover:text-mint/20 transition-colors" />
          </div>
        </div>

        {/* Meeting Card */}
        <div className="shrink-0 w-[85vw] md:w-auto snap-center glass-effect group relative flex flex-col justify-between overflow-hidden rounded-xl p-6 md:p-8 lg:col-span-1">
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 text-mint">
              <MessageSquare size={24} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Meetings</h3>
            <p className="text-sm text-slate-400">Key points and action items surfacing exactly as conversations unfold.</p>
          </div>
          <div className="mt-8 h-24 w-full rounded-lg border border-white/10 bg-gradient-to-t from-mint/5 to-transparent flex items-center justify-center">
            <span className="text-[10px] font-medium tracking-widest text-mint/40">ANALYZING TRANSCRIPT...</span>
          </div>
        </div>

        {/* Presentation Card */}
        <div className="shrink-0 w-[85vw] md:w-auto snap-center glass-effect group relative flex flex-col justify-between overflow-hidden rounded-xl p-6 md:p-8 lg:col-span-1">
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 text-mint">
              <Presentation size={24} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Presentations</h3>
            <p className="text-sm text-slate-400">Talking points and smooth transitions exactly when you need them.</p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-mint shadow-[0_0_8px_rgba(0,255,194,0.5)]"></div>
            </div>
            <span className="text-[10px] text-slate-500">Slide 12/18 - Tempo: Perfect</span>
          </div>
        </div>

        {/* Negotiation Card */}
        <div className="shrink-0 w-[85vw] md:w-auto snap-center glass-effect group relative flex flex-col justify-between overflow-hidden rounded-xl p-6 md:p-8 md:row-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-b from-mint/5 to-transparent opacity-50"></div>
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 text-mint">
              <Handshake size={24} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Negotiations</h3>
            <p className="mb-10 text-sm text-slate-400">Counter-arguments and framing suggestions in real time to maximize your leverage.</p>
            <div className="mt-10 rounded-xl border border-mint/20 bg-mint/5 p-6 shadow-inner">
              <MessageSquare className="text-mint mb-4" size={32} />
              <p className="text-xl font-bold italic leading-tight text-white">"Walked away with 18% more salary."</p>
              <p className="mt-4 text-xs font-medium tracking-widest text-mint uppercase">S. Chen, Senior Engineer</p>
            </div>
          </div>
          <div className="relative z-10 mt-10">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-1 w-1 rounded-full bg-mint"></span>
              Live Leverage Calculator Active
            </div>
          </div>
        </div>

        {/* Exam Card */}
        <div className="shrink-0 w-[85vw] md:w-auto snap-center glass-effect group relative flex flex-col justify-between overflow-hidden rounded-xl p-6 md:p-8 md:col-span-2">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 text-mint">
                <BookOpen size={24} />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">Exams & Certifications</h3>
              <p className="text-slate-400 leading-relaxed">Structured recall and reasoning support during timed sessions. We help bridge the gap between knowledge and output under pressure.</p>
            </div>
            <div className="flex shrink-0 items-center justify-center">
              <div className="relative flex items-center justify-center h-24 w-24">
                <svg className="h-full w-full rotate-[-90deg]">
                  <circle className="text-white/10" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="4"></circle>
                  <circle className="text-mint" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset="60" strokeWidth="4"></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-bold text-white">76%</span>
                  <span className="text-[8px] text-slate-500 uppercase">Retention</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Profiles */}
        <div className="shrink-0 w-[85vw] md:w-auto snap-center group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/10 p-6 md:p-8 transition-all hover:border-mint/40 lg:col-span-1">
          <p className="text-center text-sm font-medium text-slate-500 group-hover:text-slate-300">Your Use Case?</p>
          <button className="mt-4 flex items-center gap-2 text-xs font-bold text-mint">
            Custom Profiles
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = ({ onDownloadClick }: { onDownloadClick: () => void }) => {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-32">
      <div className="mb-24 flex flex-col items-center text-center">
        <span className="mb-4 inline-block rounded-full bg-mint/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-mint border border-mint/20">
          The Process
        </span>
        <h2 className="max-w-3xl text-5xl font-black tracking-tight md:text-7xl font-display">
          How <span className="text-mint">hintio</span> works.
        </h2>
        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          A high-end, stealthy AI assistant that lives in your workflow, invisible to everyone but you.
        </p>
      </div>

      <div className="flex w-full overflow-x-auto snap-x snap-mandatory gap-6 md:block md:space-y-24 pb-12 md:pb-0 -mx-6 px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="absolute left-1/2 top-0 -z-10 hidden h-full w-px bg-gradient-to-b from-mint/20 via-mint/5 to-transparent lg:block"></div>

        {/* Step 01 */}
        <div className="shrink-0 w-[90vw] md:w-auto snap-center relative grid gap-8 md:gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="mb-6 flex items-center gap-4">
              <span className="text-4xl font-black text-mint/20">01</span>
              <div className="h-px flex-1 bg-gradient-to-r from-mint/40 to-transparent"></div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-4">Invisible Overlay</h3>
            <p className="text-lg text-slate-400 leading-relaxed mb-6">
              Install hintio on Mac or Windows. It runs as a <span className="text-mint">completely invisible</span> transparent layer over your screen that screen-sharing tools cannot see.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Latency</span>
                <span className="text-sm font-bold text-white">&lt; 14ms</span>
              </div>
              <div className="h-8 w-px bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Stealth Status</span>
                <span className="text-sm font-bold text-mint">Active</span>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 group relative">
            <div className="absolute -inset-4 bg-mint/5 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 aspect-[4/3] p-1">
              <div className="scanline absolute inset-0 z-10 pointer-events-none opacity-30"></div>
              <div className="h-full w-full rounded-xl bg-[#0d0d0d] p-6 font-mono text-[10px] text-mint/60 overflow-hidden space-y-2">
                <div className="flex justify-between border-b border-mint/20 pb-2 mb-4">
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-mint animate-pulse"></span> SYSTEM_INIT</span>
                  <span>v2.4.0-STABLE</span>
                </div>
                <div className="text-mint/80">&gt; Initializing virtual overlay...</div>
                <div className="text-mint/40">&gt; Hooking display_driver_v4... [OK]</div>
                <div className="text-mint/40">&gt; Setting stealth_mask_id: 0x889F... [OK]</div>
                <div className="text-mint/80">&gt; Bypassing capture_buffer... SUCCESS</div>
                <div className="mt-8 flex justify-center">
                  <div className="relative size-32">
                    <div className="absolute inset-0 border-2 border-mint/20 rounded-full"></div>
                    <div className="absolute inset-2 border border-mint/40 rounded-full border-dashed animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className="text-mint" size={48} />
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-6 right-6 text-right">
                  <div className="text-[8px] text-slate-500">ENCRYPTION_LAYER_4</div>
                  <div className="text-xs font-bold text-white uppercase tracking-tighter">Ready for deployment</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 02 */}
        <div className="shrink-0 w-[90vw] md:w-auto snap-center relative grid gap-8 md:gap-12 lg:grid-cols-2 lg:items-center">
          <div className="group relative">
            <div className="absolute -inset-4 bg-mint/5 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <div className="text-[10px] font-mono text-mint mb-1">VOICE_SIGNAL_ANALYSIS</div>
                  <div className="text-lg font-bold text-white">Neural Calibration</div>
                </div>
                <div className="flex gap-1 items-end h-10">
                  {[4, 6, 8, 5, 10, 7].map((h, i) => (
                    <div key={i} className={`w-1 bg-mint/${(i + 1) * 15} h-${h}`}></div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between hover:border-mint/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-lg bg-mint/10 flex items-center justify-center text-mint">
                      <Zap size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Interview Mode</div>
                      <div className="text-[10px] text-slate-500">Optimized for Star Method</div>
                    </div>
                  </div>
                  <div className="size-4 rounded-full border border-mint flex items-center justify-center">
                    <div className="size-2 rounded-full bg-mint"></div>
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 flex items-center justify-between hover:border-mint/50 transition-colors cursor-pointer group/item">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover/item:text-mint transition-colors">
                      <Terminal size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-300">Technical Assessment</div>
                      <div className="text-[10px] text-slate-500">Live logic verification</div>
                    </div>
                  </div>
                  <div className="size-4 rounded-full border border-white/20"></div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2">
                  <span>SAMPLING_RATE: 48KHZ</span>
                  <span>BIOMETRIC_MATCH: 99.2%</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-[99.2%] bg-mint shadow-[0_0_10px_#00FFA3]"></div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-6 flex items-center gap-4">
              <span className="text-4xl font-black text-mint/20">02</span>
              <div className="h-px flex-1 bg-gradient-to-r from-mint/40 to-transparent"></div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-4">Voice Setup</h3>
            <p className="text-lg text-slate-400 leading-relaxed mb-6">
              Choose an AI profile like Interview or Sales. Hintio will run a quick voice test so it knows who is speaking and ignores background noise or other people.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg glass p-3 border-white/5">
                <div className="text-xs font-bold text-white mb-1">Sales Pro</div>
                <div className="text-[10px] text-slate-500">Persuasion focus</div>
              </div>
              <div className="rounded-lg glass p-3 border-white/5">
                <div className="text-xs font-bold text-white mb-1">Negotiator</div>
                <div className="text-[10px] text-slate-500">Game theory logic</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 03 */}
        <div className="shrink-0 w-[90vw] md:w-auto snap-center relative grid gap-8 md:gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="mb-6 flex items-center gap-4">
              <span className="text-4xl font-black text-mint/20">03</span>
              <div className="h-px flex-1 bg-gradient-to-r from-mint/40 to-transparent"></div>
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-4">Live Answers</h3>
            <p className="text-lg text-slate-400 leading-relaxed mb-6">
              Start your meeting. Hintio listens to the audio and reads your screen to give you fast, helpful answers. Use keyboard shortcuts to skip or hide answers smoothly.
            </p>
            <div className="inline-flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 border border-white/10">
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-mint font-bold">Ctrl</kbd>
              <span className="text-slate-500 text-xs">+</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-mint font-bold">Enter</kbd>
              <span className="text-xs text-slate-400 ml-2">Next Suggestion</span>
            </div>
          </div>
          <div className="order-1 lg:order-2 group relative">
            <div className="absolute -inset-4 bg-mint/5 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050505] p-8 aspect-video flex flex-col justify-center">
              <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className="absolute size-3 bg-red-500 rounded-full animate-ping"></div>
                  <div className="size-2 bg-red-500 rounded-full z-10"></div>
                </div>
                <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">SYSTEM_LIVE</span>
              </div>
              <div className="flex items-end justify-center gap-1 h-24 mb-6">
                {[8, 16, 24, 12, 20, 14, 10].map((h, i) => (
                  <div key={i} className={`w-1 bg-mint/${(i + 1) * 10} rounded-full h-${h} animate-pulse`}></div>
                ))}
              </div>
              <div className="glass rounded-xl p-4 border-mint/20 translate-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="text-mint" size={14} />
                  <span className="text-[8px] font-mono text-mint uppercase">Inference Generation</span>
                </div>
                <div className="text-sm font-medium text-white/90">
                  "Based on the project requirements, I recommend implementing the state management using..."
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="text-[10px] text-slate-500 font-mono italic">Processing next token...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pricing = ({
  onDownloadClick,
  onUpgradeClick,
}: {
  onDownloadClick: () => void;
  onUpgradeClick: (plan: 'monthly' | 'yearly') => void;
}) => {
  return (
    <section id="pricing" className="relative min-h-screen overflow-x-hidden grid-pattern py-32">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint/10 border border-mint/20 text-mint text-[10px] font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-mint"></span>
            </span>
            System Status: Optimized
          </div>
          <h2 className="text-6xl font-black text-white mb-4 tracking-tight font-display">Simple pricing<span className="text-mint">.</span></h2>
          <p className="text-xl text-slate-400 max-w-xl">No credits. No paywalled answers mid-interview. Choose your system level below.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Free */}
          <div className="lg:col-span-4 glass rounded-xl p-8 flex flex-col justify-between group hover:border-mint/30 transition-all">
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Level 01</h3>
                  <p className="text-2xl font-bold text-white">Free</p>
                </div>
                <Monitor className="text-slate-600 group-hover:text-mint transition-colors" />
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-white">$0</span>
                <span className="text-slate-500 font-medium">/mo</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="text-mint" size={18} /> 5 interviews/month
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="text-mint" size={18} /> Cloud AI mode
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="text-mint" size={18} /> All 6 profiles
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="text-mint" size={18} /> Mac + Windows
                </li>
              </ul>
            </div>
            <button
              onClick={onDownloadClick}
              className="w-full py-4 rounded-xl border border-mint/20 bg-mint/5 text-white font-bold hover:bg-mint/10 transition-all"
            >
              Start Free
            </button>
          </div>

          {/* Pro */}
          <div className="lg:col-span-4 glass rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group border-mint/30 bg-mint/[0.03]">
            <div className="absolute top-0 right-0 p-4">
              <div className="bg-mint text-charcoal text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                System Priority
              </div>
            </div>
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-mint text-xs font-bold uppercase tracking-widest mb-1">Level 02</h3>
                  <p className="text-2xl font-bold text-white">Pro</p>
                </div>
                <Zap className="text-mint" />
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-white">$19</span>
                <span className="text-slate-500 font-medium">/mo</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm text-slate-200">
                  <Zap className="text-mint" size={18} /> Unlimited interviews
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-200">
                  <Zap className="text-mint" size={18} /> All AI modes (Cloud, BYOK, Local)
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-200">
                  <Zap className="text-mint" size={18} /> Voice calibration
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-200">
                  <Zap className="text-mint" size={18} /> Session history
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-200">
                  <Zap className="text-mint" size={18} /> Coding self-heal
                </li>
              </ul>
            </div>
            <button
              onClick={() => onUpgradeClick('monthly')}
              className="w-full py-4 rounded-xl bg-mint text-charcoal font-black hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              Get Pro <ArrowRight size={16} />
            </button>
          </div>

          {/* Yearly */}
          <div className="lg:col-span-4 glass rounded-xl p-8 flex flex-col justify-between group hover:border-mint/30 transition-all">
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Level MAX</h3>
                  <p className="text-2xl font-bold text-white">Yearly</p>
                </div>
                <Zap className="text-slate-600 group-hover:text-mint transition-colors" />
              </div>
              <div className="mb-8">
                <span className="text-5xl font-black text-white">$99</span>
                <span className="text-slate-500 font-medium">/yr</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="text-mint" size={18} /> Everything in Pro for 1 year
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="text-mint" size={18} /> All updates during your annual plan
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle className="text-mint" size={18} /> Billed yearly
                </li>
              </ul>
            </div>
            <button
              onClick={() => onUpgradeClick('yearly')}
              className="w-full py-4 rounded-xl border border-mint/20 bg-mint/5 text-white font-bold hover:bg-mint/10 transition-all"
            >
              Get Yearly →
            </button>
          </div>

          {/* Report */}
          <div className="lg:col-span-12 glass rounded-xl p-6 mt-4 border-l-4 border-l-mint flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
              <TrendingUp size={120} />
            </div>
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-mint/10 flex items-center justify-center text-mint">
                <TrendingUp size={24} />
              </div>
              <div>
                <h4 className="text-white font-bold text-lg mb-1">Cost Optimization Report</h4>
                <p className="text-slate-400 text-sm">
                  LockedIn AI charges $54/mo — <span className="text-mint font-bold">hintio Pro saves you $420 a year.</span>
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Efficiency Metric</p>
                <p className="text-mint font-mono font-bold">+284% ROI</p>
              </div>
              <button
                onClick={onDownloadClick}
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
              >
                View Detailed Metrics <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    {
      id: "STLTH_01",
      q: "Can interviewers detect hintio?",
      a: "No. hintio runs as a custom transparent window on your computer that screen-sharing and recording tools can't capture.",
      tag: "Secure_Overlay"
    },
    {
      id: "PRIV_SYNC",
      q: "Does it send data to servers?",
      a: "If you use Cloud mode, yes. If you use your own API key or run AI locally, your data stays completely private on your machine.",
      tag: "Local_First"
    },
    {
      id: "ARCH_COMP",
      q: "Does it work on Mac and Windows?",
      a: "Yes. It fully supports all modern Macs (including M1/M2/M3) and Windows 10/11 computers.",
      tag: "Multi_Arch_Support"
    }
  ];

  return (
    <section id="faq" className="mx-auto max-w-7xl px-6 py-32 lg:px-20">
      <div className="flex flex-col gap-4 mb-12 border-l-2 border-mint pl-6">
        <div className="flex items-center gap-2 text-mint/60 font-mono text-xs uppercase tracking-[0.3em]">
          <span>Query_Interface_Active</span>
          <span className="h-px w-12 bg-mint/30"></span>
        </div>
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase text-white font-display">Got questions?</h2>
        <p className="text-mint font-mono text-sm max-w-xl">System Protocol v2.4.0 - Knowledge Database Access. Answers to your most common questions about how the app works.</p>
      </div>

      <div className="mb-12">
        <label className="relative flex w-full h-16 glass rounded-lg overflow-hidden group">
          <div className="flex items-center justify-center px-6 text-mint group-focus-within:scale-110 transition-transform">
            <Search size={32} />
          </div>
          <input className="flex-1 bg-transparent border-none text-xl font-light placeholder:text-mint/20 focus:ring-0 text-white" placeholder="QUERY_SYSTEM_DATABASE..." type="text" />
          <div className="flex items-center px-6 font-mono text-[10px] text-mint/40 uppercase tracking-widest">
            Press_Enter_to_Execute
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {faqs.map((faq) => (
          <div key={faq.id} className="flex flex-col glass rounded-xl p-6 relative overflow-hidden group hover:border-mint/40 transition-all">
            <div className="absolute top-0 right-0 p-2 font-mono text-[10px] text-mint/30 uppercase">ID: {faq.id}</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded bg-mint/10 flex items-center justify-center text-mint border border-mint/20">
                <Terminal size={20} />
              </div>
              <h3 className="text-lg font-bold leading-tight uppercase tracking-tight">{faq.q}</h3>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-mint/20 to-transparent mb-4"></div>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              {faq.a}
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="text-[10px] font-mono text-mint bg-mint/5 px-2 py-0.5 border border-mint/10 uppercase">{faq.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ShortcutsHelp = () => {
  const primaryShortcuts = [
    {
      keybind: 'Ctrl+Enter',
      title: 'Main Action: Screenshot + Answer',
      description: 'Takes a screenshot of your current screen, checks for questions, and gives you the next answer.',
    },
    {
      keybind: 'Ctrl+\\',
      title: 'Toggle Visibility',
      description: 'Instantly hide/show the Hintio overlay.',
    },
    {
      keybind: 'Ctrl+M',
      title: 'Toggle Click Over',
      description: 'Switch click-through mode so the overlay does or does not capture mouse interaction.',
    },
  ];

  const dockImageShortcuts = [
    {
      keybind: 'Ctrl+Shift+Q',
      title: 'Dock Right',
      placeholder: 'Dock Right image placeholder',
    },
    {
      keybind: 'Ctrl+Shift+R',
      title: 'Dock Left',
      placeholder: 'Dock Left image placeholder',
    },
  ];

  const otherShortcuts = [
    { keybind: 'Ctrl+Up', action: 'Move Up' },
    { keybind: 'Ctrl+Down', action: 'Move Down' },
    { keybind: 'Ctrl+Left', action: 'Move Left' },
    { keybind: 'Ctrl+Right', action: 'Move Right' },
    { keybind: 'Ctrl+[', action: 'Previous Response' },
    { keybind: 'Ctrl+]', action: 'Next Response' },
    { keybind: 'Ctrl+Shift+Up', action: 'Scroll Up' },
    { keybind: 'Ctrl+Shift+Down', action: 'Scroll Down' },
    { keybind: 'Ctrl+Shift+T', action: 'Dock Default' },
    { keybind: 'Ctrl+Shift+X', action: 'Emergency Erase' },
  ];

  return (
    <section id="shortcuts-help" className="mx-auto max-w-7xl px-6 py-32 lg:px-20">
      <div className="mb-14 max-w-4xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-mint">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint"></span>
          </span>
          Shortcut Protocol
        </div>
        <h2 className="text-5xl md:text-7xl font-black tracking-tight text-white font-display mb-4">Hintio Shortcuts Help</h2>
        <p className="text-lg text-slate-400">A quick blog-style guide to all keyboard shortcuts used in live sessions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        {primaryShortcuts.map((shortcut, index) => (
          <div key={shortcut.keybind} className={`glass rounded-xl p-6 border ${index === 0 ? 'border-mint/40' : 'border-white/10'}`}>
            <p className="text-[10px] uppercase tracking-widest text-mint font-mono mb-3">Priority Shortcut</p>
            <h3 className="text-2xl font-black text-white mb-2">{shortcut.keybind}</h3>
            <p className="text-sm text-white mb-2 font-semibold">{shortcut.title}</p>
            <p className="text-sm text-slate-400 leading-relaxed">{shortcut.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {dockImageShortcuts.map((shortcut) => (
          <div key={shortcut.keybind} className="glass rounded-xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-black text-white">{shortcut.title}</h3>
              <span className="font-mono text-xs text-mint">{shortcut.keybind}</span>
            </div>
            <div className="aspect-[16/9] bg-black/40 border-2 border-dashed border-mint/30 m-5 rounded-lg flex items-center justify-center">
              <span className="text-sm text-mint/70 font-mono uppercase tracking-widest">{shortcut.placeholder}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl border border-white/10 p-6">
        <h3 className="text-2xl font-black text-white mb-5">All Other Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {otherShortcuts.map((shortcut) => (
            <div key={shortcut.keybind} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-300">{shortcut.action}</span>
              <span className="text-xs font-mono text-mint">{shortcut.keybind}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = ({ onDownloadClick }: { onDownloadClick: () => void }) => {
  return (
    <footer className="w-full border-t border-white/5 bg-charcoal/50 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-mint flex items-center justify-center">
                <Monitor className="text-charcoal font-bold" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">hintio</span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-xs">
              The invisible interview co-pilot. Built for the modern engineer.
            </p>
          </div>
          <div className="md:col-span-4 grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-mint">Product</h4>
              <nav className="flex flex-col gap-3">
                <a className="text-slate-400 hover:text-mint transition-colors text-sm" href="#">Use Cases</a>
                <a className="text-slate-400 hover:text-mint transition-colors text-sm" href="#">How it works</a>
                <a className="text-slate-400 hover:text-mint transition-colors text-sm" href="#">Pricing</a>
              </nav>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-mono uppercase tracking-widest text-mint">Resources</h4>
              <nav className="flex flex-col gap-3">
                <button
                  onClick={onDownloadClick}
                  className="text-slate-400 hover:text-mint transition-colors text-sm text-left"
                >
                  Download
                </button>
                <a className="text-slate-400 hover:text-mint transition-colors text-sm" href="#">Blog</a>
              </nav>
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col items-start md:items-end gap-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-white/5 border border-white/10">
              <span className="font-mono text-[10px] text-slate-500">BUILD</span>
              <span className="font-mono text-xs text-mint">v0.7.0</span>
            </div>
            <div className="flex gap-4">
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:border-mint/50 hover:text-mint transition-all">
                <Command size={20} />
              </button>
              <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:border-mint/50 hover:text-mint transition-all">
                <Option size={20} />
              </button>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-600 text-xs font-mono">
            © 2026 hintio.tech — ALL RIGHTS RESERVED
          </p>
          <div className="flex gap-8">
            <a className="text-slate-600 hover:text-slate-300 text-xs transition-colors" href="#">Privacy Policy</a>
            <a className="text-slate-600 hover:text-slate-300 text-xs transition-colors" href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};



const AuthGateModal = ({
  isOpen,
  onClose,
  onSignIn,
  isSigningIn,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  isSigningIn: boolean;
  error: string | null;
}) => {

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass rounded-2xl overflow-hidden border-white/10 shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 md:p-10">
              <div className="mb-8">
                <div className="size-12 rounded-xl bg-mint/10 flex items-center justify-center text-mint mb-6">
                  <Shield size={24} />
                </div>
                <h3 className="text-3xl font-black text-white mb-2 font-display">Sign in to continue.</h3>
                <p className="text-slate-400">Authenticate with Google to access pricing downloads and install hintio.</p>
              </div>

              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="w-full py-4 bg-mint text-charcoal font-bold rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSigningIn ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                Continue with Google
              </button>

              {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
              )}

              <p className="mt-6 text-[10px] text-slate-600 text-center uppercase tracking-widest">
                You will be redirected to Google and returned automatically.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const TrialKeyModal = ({
  isOpen,
  trialKey,
  onCopy,
  onDone,
  isCopied,
}: {
  isOpen: boolean;
  trialKey: string;
  onCopy: () => void;
  onDone: () => void;
  isCopied: boolean;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass rounded-2xl overflow-hidden border-white/10 shadow-2xl p-8"
          >
            <div className="mb-6">
              <div className="size-12 rounded-xl bg-mint/10 flex items-center justify-center text-mint mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-3xl font-black text-white mb-2 font-display">Your free trial key</h3>
              <p className="text-slate-400">
                This is the free trial key for hintio. It works for 3 interviews for 15 minutes.
                Upgrade to Pro tier for unlimited interviews.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Trial Key</p>
              <p className="font-mono text-mint break-all">{trialKey}</p>
            </div>

            <p className="text-sm text-amber-300 mb-6">
              You won&apos;t see this key again. Please save it.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onCopy}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
              >
                {isCopied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={onDone}
                className="flex-1 py-3 bg-mint text-charcoal font-bold rounded-xl hover:scale-[1.02] transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const MacComingSoonModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass rounded-2xl overflow-hidden border-white/10 shadow-2xl p-8"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <h3 className="text-3xl font-black text-white mb-3 font-display">Mac download coming soon</h3>
            <p className="text-slate-400 mb-6">
              Mac installer is not live yet. Please use Windows build for now.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-mint text-charcoal font-bold rounded-xl hover:scale-[1.02] transition-all"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PaymentSupportModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass rounded-2xl overflow-hidden border-white/10 shadow-2xl p-8"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <h3 className="text-3xl font-black text-white mb-3 font-display">Payment auth is down</h3>
            <p className="text-slate-400 mb-6">
              For upgrade help, contact via WhatsApp at +9174448865095.
            </p>
            <a
              href="https://wa.me/9174448865095"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center py-3 bg-mint text-charcoal font-bold rounded-xl hover:scale-[1.02] transition-all"
            >
              Contact on WhatsApp
            </a>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PaidLicenseModal = ({
  isOpen,
  plan,
  licenseKey,
  isCopied,
  onCopy,
  onDownload,
  onClose,
}: {
  isOpen: boolean;
  plan: 'monthly' | 'yearly';
  licenseKey: string;
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onClose: () => void;
}) => {
  const planLabel = plan === 'monthly' ? '1 Month Pro key' : '1 Year Pro key';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl glass rounded-2xl overflow-hidden border-white/10 shadow-2xl p-8"
          >
            <div className="absolute top-0 right-0 p-4">
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <div className="size-12 rounded-xl bg-mint/10 flex items-center justify-center text-mint mb-6">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-3xl font-black text-white mb-2 font-display">Payment successful</h3>
              <p className="text-slate-400">
                Here is your {planLabel}. Install the app using the button below and use this key for access.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">{planLabel}</p>
              <p className="font-mono text-mint break-all">{licenseKey}</p>
            </div>

            <p className="text-sm text-amber-300 mb-6">
              Save this key now. You can use it to unlock the desktop app.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={onCopy}
                className="py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
              >
                {isCopied ? 'Copied' : 'Copy key'}
              </button>
              <button
                type="button"
                onClick={onDownload}
                className="py-3 bg-mint text-charcoal font-bold rounded-xl hover:scale-[1.02] transition-all"
              >
                Install app
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const windowsDownloadUrl = 'https://github.com/Shomesh007/hintio/releases/download/v1.0.0/Hintio-1.0.1.Setup.exe';
  const defaultSupabaseUrl = 'https://vsybqtunyuanxspxhzue.supabase.co';
  const supabaseFunctionsBaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  type AuthIntent = 'download' | 'upgrade_monthly' | 'upgrade_yearly';
  const AUTH_INTENT_STORAGE_KEY = 'hintio_auth_intent';
  const postAuthRunGuardRef = useRef(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authIntent, setAuthIntent] = useState<AuthIntent>('download');
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [trialKey, setTrialKey] = useState('');
  const [isKeyCopied, setIsKeyCopied] = useState(false);
  const [isMacModalOpen, setIsMacModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPaidLicenseModalOpen, setIsPaidLicenseModalOpen] = useState(false);
  const [paidLicenseKey, setPaidLicenseKey] = useState('');
  const [paidLicensePlan, setPaidLicensePlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isPaidLicenseCopied, setIsPaidLicenseCopied] = useState(false);
  const isHelpRoute = /^\/help\/?$/.test(window.location.pathname);

  const debugLog = (...args: unknown[]) => {
    void args;
  };

  useEffect(() => {
    debugLog('App mounted', {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      host: window.location.host,
      hostname: window.location.hostname,
      port: window.location.port,
      isDev: import.meta.env.DEV,
      storedIntent: window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY),
    });
  }, []);

  const loadRazorpayScript = async () => {
    debugLog('loadRazorpayScript called', { hasRazorpay: Boolean(window.Razorpay) });
    if (window.Razorpay) {
      debugLog('Razorpay already loaded');
      return true;
    }

    return await new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        debugLog('Razorpay script loaded successfully');
        resolve(true);
      };
      script.onerror = () => {
        debugLog('Razorpay script failed to load');
        resolve(false);
      };
      document.body.appendChild(script);
      debugLog('Razorpay script tag appended');
    });
  };

  const downloadAfterTrialKey = () => {
    setIsTrialModalOpen(false);
    setIsKeyCopied(false);
    triggerDownload();
  };

  const handleCopyTrialKey = async () => {
    if (!trialKey) return;
    await navigator.clipboard.writeText(trialKey);
    setIsKeyCopied(true);
  };

  const triggerDownload = () => {
    debugLog('triggerDownload called', { windowsDownloadUrl });
    window.open(windowsDownloadUrl, '_blank', 'noopener,noreferrer');
  };

  const fetchPaidLicenseKey = async (plan: 'monthly' | 'yearly') => {
    if (!supabase) throw new Error('Supabase is not configured');

    const fetchFromLicensesTable = async (userEmail: string) => {
      const { data, error } = await supabase
        .from('licenses')
        .select('license_key,plan,status,created_at')
        .eq('email', userEmail)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !data?.length) {
        return null;
      }

      const matchedPlan = data.find((row) => row.plan === plan && typeof row.license_key === 'string');
      if (matchedPlan?.license_key) {
        return String(matchedPlan.license_key);
      }

      const latest = data.find((row) => typeof row.license_key === 'string');
      return latest?.license_key ? String(latest.license_key) : null;
    };

    const attemptCount = 15;
    for (let attempt = 1; attempt <= attemptCount; attempt++) {
      const { data: sessionData } = await supabase.auth.getSession();
      const fallbackEmail = sessionData.session?.user?.email ?? null;
      if (fallbackEmail) {
        const fallbackKey = await fetchFromLicensesTable(fallbackEmail);
        if (fallbackKey) {
          debugLog('fetchPaidLicenseKey succeeded via licenses table fallback', {
            attempt,
            attemptCount,
            email: fallbackEmail,
          });
          return fallbackKey;
        }
      }

      debugLog('fetchPaidLicenseKey attempt failed', {
        attempt,
        attemptCount,
        error: 'licenses table fallback did not find key yet',
        hasLicenseKey: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Payment was successful, but your key is still processing. Please contact support if it does not appear in 1-2 minutes.');
  };

  const issuePaidLicenseKey = async (
    plan: 'monthly' | 'yearly',
    paymentResponse?: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_subscription_id?: string;
      razorpay_signature?: string;
    },
  ) => {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.functions.invoke('issue-paid-license', {
      body: {
        plan,
        paymentId: paymentResponse?.razorpay_payment_id ?? null,
        orderId: paymentResponse?.razorpay_order_id ?? null,
        subscriptionId: paymentResponse?.razorpay_subscription_id ?? null,
        signature: paymentResponse?.razorpay_signature ?? null,
      },
    });

    if (error || !data?.licenseKey) {
      throw new Error(error?.message ?? 'Issue paid license function failed');
    }

    return String(data.licenseKey);
  };

  const handleCopyPaidLicenseKey = async () => {
    if (!paidLicenseKey) return;
    await navigator.clipboard.writeText(paidLicenseKey);
    setIsPaidLicenseCopied(true);
  };

  const startRazorpayCheckout = async (plan: 'monthly' | 'yearly') => {
    debugLog('startRazorpayCheckout invoked', { plan, href: window.location.href });
    if (!supabase) {
      debugLog('startRazorpayCheckout blocked: supabase not configured', { missingSupabaseEnvVars });
      setAuthError(`Supabase is not configured. Missing: ${missingSupabaseEnvVars.join(', ')}`);
      setIsAuthModalOpen(true);
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    debugLog('startRazorpayCheckout getSession result', {
      hasSession: Boolean(sessionData.session),
      sessionError: sessionError?.message ?? null,
      userId: sessionData.session?.user?.id ?? null,
      email: sessionData.session?.user?.email ?? null,
    });

    if (!sessionData.session) {
      debugLog('startRazorpayCheckout no session, opening auth modal', { plan });
      setAuthIntent(plan === 'monthly' ? 'upgrade_monthly' : 'upgrade_yearly');
      setIsAuthModalOpen(true);
      return;
    }

    const getJwtIat = (accessToken: string) => {
      try {
        const [, payloadBase64] = accessToken.split('.');
        if (!payloadBase64) return null;
        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
        const decoded = JSON.parse(window.atob(padded)) as { iat?: number };
        return typeof decoded.iat === 'number' ? decoded.iat : null;
      } catch {
        return null;
      }
    };

    const waitForTokenNotInFuture = async (accessToken: string) => {
      const iat = getJwtIat(accessToken);
      const nowSec = Math.floor(Date.now() / 1000);
      const skewBufferSec = 5;
      if (iat && iat >= nowSec - skewBufferSec) {
        const waitMs = Math.max(0, (iat - nowSec + skewBufferSec + 1) * 1000);
        debugLog('Access token iat too close/future; waiting before edge call', {
          iat,
          nowSec,
          skewBufferSec,
          waitMs,
        });
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    };

    setIsCheckoutLoading(true);
    debugLog('Checkout loading started');

    const isScriptLoaded = await loadRazorpayScript();
    debugLog('Razorpay script load result', { isScriptLoaded, hasRazorpay: Boolean(window.Razorpay) });
    if (!isScriptLoaded || !window.Razorpay) {
      debugLog('Checkout blocked: Razorpay script unavailable');
      setIsCheckoutLoading(false);
      setIsPaymentModalOpen(true);
      return;
    }

    let activeAccessToken = sessionData.session.access_token;
    await waitForTokenNotInFuture(activeAccessToken);

    const invokeCheckout = async (accessToken: string) =>
      await supabase.functions.invoke('create-razorpay-checkout', {
        body: { plan },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

    const invokeCheckoutViaFetch = async (accessToken: string) => {
      if (!supabaseAnonKey) {
        return {
          ok: false,
          status: null as number | null,
          data: null as Record<string, unknown> | null,
          body: 'Missing VITE_SUPABASE_ANON_KEY for fetch fallback.',
        };
      }

      const response = await fetch(`${supabaseFunctionsBaseUrl}/functions/v1/create-razorpay-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      const bodyText = await response.text();
      let parsedBody: Record<string, unknown> | null = null;
      try {
        parsedBody = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : null;
      } catch {
        parsedBody = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        data: parsedBody,
        body: bodyText,
      };
    };

    let { data: checkoutData, error: checkoutError } = await invokeCheckout(activeAccessToken);

    const getCheckoutErrorStatus = (error: unknown) => {
      const directStatus = (error as { status?: unknown } | null)?.status;
      if (typeof directStatus === 'number') return directStatus;

      const contextStatus = (error as { context?: { status?: unknown } } | null)?.context?.status;
      if (typeof contextStatus === 'number') return contextStatus;

      const responseStatus = (error as { response?: { status?: unknown } } | null)?.response?.status;
      if (typeof responseStatus === 'number') return responseStatus;

      return null;
    };

    const readCheckoutErrorContext = async (error: unknown) => {
      try {
        const context = (error as { context?: Response } | null)?.context;
        if (!context) {
          return {
            status: null,
            body: null,
          };
        }

        const body = await context.clone().text();
        return {
          status: context.status,
          body,
        };
      } catch {
        return {
          status: null,
          body: null,
        };
      }
    };

    const initialCheckoutStatus = getCheckoutErrorStatus(checkoutError);
    const shouldRetryForAuth =
      initialCheckoutStatus === 401 ||
      ((checkoutError as { name?: string } | null)?.name === 'FunctionsHttpError' && !checkoutData);

    if (shouldRetryForAuth) {
      debugLog('create-razorpay-checkout returned 401, attempting session refresh + retry');
      const { data: refreshedSessionData, error: refreshError } = await supabase.auth.refreshSession();
      debugLog('refreshSession result before checkout retry', {
        refreshError: refreshError?.message ?? null,
        hasSession: Boolean(refreshedSessionData.session),
      });

      if (!refreshError && refreshedSessionData.session?.access_token) {
        activeAccessToken = refreshedSessionData.session.access_token;
        await waitForTokenNotInFuture(activeAccessToken);
        ({ data: checkoutData, error: checkoutError } = await invokeCheckout(activeAccessToken));

        const postRetryStatus = getCheckoutErrorStatus(checkoutError);
        if ((postRetryStatus === 401 || !checkoutData) && activeAccessToken) {
          debugLog('SDK invoke still failing after retry; trying direct fetch fallback');
          const fallbackResult = await invokeCheckoutViaFetch(activeAccessToken);
          debugLog('Direct fetch fallback result', {
            ok: fallbackResult.ok,
            status: fallbackResult.status,
            body: fallbackResult.body,
          });
          debugLog('Direct fetch fallback result JSON', JSON.stringify({
            ok: fallbackResult.ok,
            status: fallbackResult.status,
            body: fallbackResult.body,
          }));

          if (fallbackResult.ok && fallbackResult.data) {
            checkoutData = fallbackResult.data as typeof checkoutData;
            checkoutError = null;
          }
        }
      }
    }

    const finalCheckoutStatus = getCheckoutErrorStatus(checkoutError);

    const checkoutErrorContext = await readCheckoutErrorContext(checkoutError);

    debugLog('create-razorpay-checkout response', {
      hasData: Boolean(checkoutData),
      checkoutError: checkoutError?.message ?? null,
      checkoutErrorName: (checkoutError as { name?: string } | null)?.name ?? null,
      initialCheckoutStatus,
      finalCheckoutStatus,
      contextStatus: checkoutErrorContext.status,
      contextBody: checkoutErrorContext.body,
      mode: checkoutData?.mode ?? null,
      hasKeyId: Boolean(checkoutData?.keyId),
      orderId: checkoutData?.orderId ?? null,
      subscriptionId: checkoutData?.subscriptionId ?? null,
    });
    debugLog('create-razorpay-checkout response JSON', JSON.stringify({
      hasData: Boolean(checkoutData),
      checkoutError: checkoutError?.message ?? null,
      checkoutErrorName: (checkoutError as { name?: string } | null)?.name ?? null,
      initialCheckoutStatus,
      finalCheckoutStatus,
      contextStatus: checkoutErrorContext.status,
      contextBody: checkoutErrorContext.body,
      mode: checkoutData?.mode ?? null,
      hasKeyId: Boolean(checkoutData?.keyId),
      orderId: checkoutData?.orderId ?? null,
      subscriptionId: checkoutData?.subscriptionId ?? null,
    }));

    if (checkoutError || !checkoutData?.keyId) {
      debugLog('Checkout blocked: function returned error or missing keyId');
      setIsCheckoutLoading(false);
      setIsPaymentModalOpen(true);
      return;
    }

    const options: Record<string, unknown> = {
      key: checkoutData.keyId,
      name: checkoutData.name ?? 'hintio',
      description: checkoutData.description ?? 'hintio payment',
      prefill: checkoutData.prefill ?? {},
      readonly: {
        email: true,
      },
      notes: {
        plan_type: plan,
      },
      handler: async (paymentResponse?: {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_subscription_id?: string;
        razorpay_signature?: string;
      }) => {
        setIsCheckoutLoading(true);
        try {
          let licenseKey: string | null = null;

          try {
            licenseKey = await issuePaidLicenseKey(plan, paymentResponse);
            debugLog('issuePaidLicenseKey succeeded', {
              plan,
              hasPaymentId: Boolean(paymentResponse?.razorpay_payment_id),
              hasOrderId: Boolean(paymentResponse?.razorpay_order_id),
              hasSubscriptionId: Boolean(paymentResponse?.razorpay_subscription_id),
            });
          } catch (issueError) {
            debugLog('issuePaidLicenseKey failed, falling back to polling', {
              message: issueError instanceof Error ? issueError.message : String(issueError),
            });
            licenseKey = await fetchPaidLicenseKey(plan);
          }

          setPaidLicensePlan(plan);
          setPaidLicenseKey(licenseKey);
          setIsPaidLicenseCopied(false);
          setIsPaidLicenseModalOpen(true);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Payment was successful, but key retrieval failed.';
          alert(message);
        } finally {
          setIsCheckoutLoading(false);
        }
      },
      modal: {
        ondismiss: () => setIsCheckoutLoading(false),
      },
      theme: {
        color: '#00FFCC',
      },
    };

    if (checkoutData.mode === 'subscription') {
      options.subscription_id = checkoutData.subscriptionId;
    } else {
      options.order_id = checkoutData.orderId;
      options.amount = checkoutData.amount;
      options.currency = checkoutData.currency;
    }

    debugLog('Opening Razorpay checkout', {
      mode: checkoutData.mode,
      plan,
      orderId: checkoutData.orderId ?? null,
      subscriptionId: checkoutData.subscriptionId ?? null,
      amount: checkoutData.amount ?? null,
      currency: checkoutData.currency ?? null,
    });
    const razorpay = new window.Razorpay(options);
    razorpay.open();
    setIsCheckoutLoading(false);
    debugLog('Checkout loading ended after razorpay.open()');
  };

  useEffect(() => {
    const runPostAuthAction = async () => {
      if (postAuthRunGuardRef.current) {
        debugLog('runPostAuthAction skipped by guard (StrictMode double-invoke)');
        return;
      }
      postAuthRunGuardRef.current = true;

      if (!supabase) return;

      const params = new URLSearchParams(window.location.search);
      const intentParam = params.get('intent');
      const legacyDownloadParam = params.get('download') === '1';
      const storedIntent = window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY);
      const hasAuthCallbackMarkers = Boolean(
        params.get('code') ||
        params.get('access_token') ||
        params.get('refresh_token') ||
        params.get('error')
      );

      debugLog('runPostAuthAction started', {
        href: window.location.href,
        intentParam,
        legacyDownloadParam,
        storedIntent,
        hasAuthCallbackMarkers,
      });

      const intent =
        intentParam === 'download' ||
          intentParam === 'upgrade_monthly' ||
          intentParam === 'upgrade_yearly'
          ? (intentParam as AuthIntent)
          : storedIntent === 'download' ||
            storedIntent === 'upgrade_monthly' ||
            storedIntent === 'upgrade_yearly'
            ? (storedIntent as AuthIntent)
            : legacyDownloadParam
              ? 'download'
              : null;

      debugLog('runPostAuthAction resolved intent', { intent });

      if (!intent) return;

      const clearIntentMarkers = () => {
        debugLog('Clearing intent markers from storage and URL');
        window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
        params.delete('intent');
        params.delete('download');
        const nextSearch = params.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
        debugLog('Intent markers cleared', { nextUrl });
      };

      const continueIntent = async (activeIntent: AuthIntent) => {
        debugLog('continueIntent entered', { activeIntent });
        clearIntentMarkers();

        if (activeIntent === 'upgrade_monthly') {
          debugLog('continueIntent -> upgrade_monthly');
          await startRazorpayCheckout('monthly');
          return;
        }

        if (activeIntent === 'upgrade_yearly') {
          debugLog('continueIntent -> upgrade_yearly');
          await startRazorpayCheckout('yearly');
          return;
        }

        debugLog('continueIntent -> download flow, requesting trial key');
        const { data: keyData, error: keyError } = await supabase.rpc('claim_three_usage_trial_key');
        debugLog('claim_three_usage_trial_key response', {
          hasKeyData: Boolean(keyData),
          keyError: keyError?.message ?? null,
          isNew: keyData?.is_new ?? null,
          hasAccessKey: Boolean(keyData?.access_key),
        });

        if (keyError || !keyData?.access_key) {
          setAuthError(keyError?.message ?? 'Could not fetch free trial key.');
          setIsAuthModalOpen(true);
          return;
        }

        if (keyData.is_new) {
          setTrialKey(String(keyData.access_key));
          setIsTrialModalOpen(true);
        } else {
          triggerDownload();
        }
      };

      const { data, error: postAuthSessionError } = await supabase.auth.getSession();
      debugLog('runPostAuthAction getSession result', {
        hasSession: Boolean(data.session),
        postAuthSessionError: postAuthSessionError?.message ?? null,
        userId: data.session?.user?.id ?? null,
        email: data.session?.user?.email ?? null,
      });

      if (data.session) {
        debugLog('Session available immediately after OAuth callback');
        await continueIntent(intent);
        return;
      }

      if (!hasAuthCallbackMarkers) {
        debugLog('No callback markers and no session; clearing stale auth intent', { intent });
        window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY);
        return;
      }

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        debugLog('onAuthStateChange event', {
          event,
          hasSession: Boolean(session),
          userId: session?.user?.id ?? null,
          email: session?.user?.email ?? null,
        });
        if (event === 'SIGNED_IN' && session) {
          authListener.subscription.unsubscribe();
          debugLog('SIGNED_IN received, continuing intent');
          void continueIntent(intent);
        }
      });

      setTimeout(() => {
        debugLog('Auth listener timeout reached, unsubscribing');
        authListener.subscription.unsubscribe();
        setAuthError('Google login callback did not produce a session. Check device clock and Supabase redirect URL settings.');
        setIsAuthModalOpen(true);
      }, 20000);
    };

    runPostAuthAction();
  }, []);

  const startGoogleSignIn = async () => {
    setAuthError(null);
    debugLog('startGoogleSignIn called', {
      authIntent,
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      host: window.location.host,
    });

    if (!supabase) {
      debugLog('startGoogleSignIn blocked: supabase not configured', { missingSupabaseEnvVars });
      setAuthError(`Supabase is not configured. Missing: ${missingSupabaseEnvVars.join(', ')}`);
      return;
    }

    setIsAuthModalOpen(false);
    setIsSigningIn(true);
    window.localStorage.setItem(AUTH_INTENT_STORAGE_KEY, authIntent);
    debugLog('Stored auth intent before OAuth redirect', {
      storageKey: AUTH_INTENT_STORAGE_KEY,
      authIntent,
    });

    const redirectTo = (() => {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.hash = '';
      redirectUrl.search = '';
      redirectUrl.searchParams.set('intent', authIntent);
      return redirectUrl.toString();
    })();

    debugLog('Calling signInWithOAuth', { redirectTo });

    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      debugLog('signInWithOAuth returned error', { message: error.message });
      setAuthError(error.message);
      setIsSigningIn(false);
      return;
    }

    debugLog('signInWithOAuth initiated successfully', {
      hasUrl: Boolean(oauthData?.url),
      oauthUrl: oauthData?.url ?? null,
    });

    if (!oauthData?.url) {
      setAuthError('OAuth URL was not returned by Supabase.');
      setIsSigningIn(false);
      return;
    }

    window.location.assign(oauthData.url);
  };

  const handleDownloadClick = async () => {
    setAuthError(null);
    setAuthIntent('download');
    debugLog('handleDownloadClick called');

    if (!supabase) {
      debugLog('handleDownloadClick blocked: supabase not configured', { missingSupabaseEnvVars });
      setAuthError(`Supabase is not configured. Missing: ${missingSupabaseEnvVars.join(', ')}`);
      setIsAuthModalOpen(true);
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    debugLog('handleDownloadClick getSession result', {
      hasSession: Boolean(data.session),
      sessionError: error?.message ?? null,
      userId: data.session?.user?.id ?? null,
    });

    if (data.session) {
      triggerDownload();
      return;
    }

    debugLog('No session, opening auth modal for download flow');
    setIsAuthModalOpen(true);
  };

  const handleMacDownloadClick = () => {
    setIsMacModalOpen(true);
  };

  const handleUpgradeClick = async (plan: 'monthly' | 'yearly') => {
    setAuthError(null);
    debugLog('handleUpgradeClick called', { plan });
    setAuthIntent(plan === 'monthly' ? 'upgrade_monthly' : 'upgrade_yearly');
    await startRazorpayCheckout(plan);
  };

  return (
    <div className="bg-charcoal min-h-screen text-white selection:bg-mint selection:text-charcoal">
      <Navbar onDownloadClick={handleDownloadClick} />
      {isHelpRoute ? (
        <main className="pt-20">
          <ShortcutsHelp />
        </main>
      ) : (
        <>
          <Hero onDownloadClick={handleDownloadClick} onMacDownloadClick={handleMacDownloadClick} />
          <UseCases onDownloadClick={handleDownloadClick} />
          <HowItWorks onDownloadClick={handleDownloadClick} />
          <ShortcutsHelp />
          <Pricing onDownloadClick={handleDownloadClick} onUpgradeClick={handleUpgradeClick} />
          <FAQ />

          {/* Final CTA Section */}
          <section className="relative w-full max-w-5xl mx-auto px-6 py-32 z-10">
            <div className="glass glow-border rounded-xl overflow-hidden">
              <div className="border-b border-mint/20 bg-mint/5 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-mint/50"></div>
                  <span className="ml-4 font-mono text-[10px] uppercase tracking-widest text-mint/60">System Deployment // Live_Session</span>
                </div>
                <div className="font-mono text-[10px] text-mint/40 flex items-center gap-4">
                  <span>LATENCY: 12ms</span>
                  <span>STATUS: READY</span>
                </div>
              </div>
              <div className="p-8 md:p-16 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-mint/30 bg-mint/10 mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-mint"></span>
                  </span>
                  <span className="font-mono text-xs text-mint uppercase tracking-tighter">Ready for production</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 font-display">
                  Your next offer <span className="text-mint">starts today.</span>
                </h2>
                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12">
                  Install in 2 minutes. No setup. No excuses.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
                  <button
                    onClick={handleMacDownloadClick}
                    className="flex-1 group relative px-8 py-4 bg-mint text-charcoal font-bold rounded-lg overflow-hidden transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Monitor size={20} />
                      <span>Download for Mac (.dmg)</span>
                    </div>
                  </button>
                  <button
                    onClick={handleDownloadClick}
                    className="flex-1 group relative px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-lg overflow-hidden transition-all hover:bg-white/10 hover:border-mint/40 active:scale-95"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Layers size={20} />
                      <span>Download for Windows (.exe)</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <Footer onDownloadClick={handleDownloadClick} />

      <AuthGateModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={startGoogleSignIn}
        isSigningIn={isSigningIn}
        error={authError}
      />

      <TrialKeyModal
        isOpen={isTrialModalOpen}
        trialKey={trialKey}
        onCopy={handleCopyTrialKey}
        onDone={downloadAfterTrialKey}
        isCopied={isKeyCopied}
      />

      <MacComingSoonModal
        isOpen={isMacModalOpen}
        onClose={() => setIsMacModalOpen(false)}
      />

      <PaymentSupportModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      <PaidLicenseModal
        isOpen={isPaidLicenseModalOpen}
        plan={paidLicensePlan}
        licenseKey={paidLicenseKey}
        isCopied={isPaidLicenseCopied}
        onCopy={handleCopyPaidLicenseKey}
        onDownload={triggerDownload}
        onClose={() => setIsPaidLicenseModalOpen(false)}
      />

      {isCheckoutLoading && (
        <div className="fixed bottom-6 right-6 z-[140] rounded-lg border border-mint/40 bg-charcoal/90 px-4 py-3 text-sm text-mint">
          Initializing secure Razorpay checkout...
        </div>
      )}
    </div>
  );
}
