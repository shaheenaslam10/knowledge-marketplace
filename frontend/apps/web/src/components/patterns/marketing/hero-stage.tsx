"use client";

import Link from "next/link";
import {
  Code2,
  Lock,
  Mic,
  Monitor,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
  Zap,
} from "lucide-react";

export function AnimatedHeroBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* Blob 1: Electric Indigo */}
      <div className="absolute -top-24 -left-24 size-[520px] rounded-full bg-gradient-to-br from-indigo-600/35 to-primary/25 blur-[120px] animate-blob" />
      {/* Blob 2: Vibrant Cyan / Teal */}
      <div className="absolute -bottom-24 -right-24 size-[540px] rounded-full bg-gradient-to-br from-cyan-500/30 via-teal-500/25 to-blue-600/20 blur-[130px] animate-blob animation-delay-2000" />
      {/* Blob 3: Warm Violet / Amber Accent */}
      <div className="absolute top-1/3 left-1/3 size-[460px] rounded-full bg-gradient-to-tr from-violet-600/25 via-fuchsia-500/20 to-amber-500/20 blur-[140px] animate-blob animation-delay-4000" />
      {/* Architectural Dot Mesh Grid */}
      <div className="bg-tech-grid absolute inset-0 opacity-20 pointer-events-none" />
    </div>
  );
}

export function HeroGraphicStage() {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none select-none">
      {/* Ambient Backdrop Glow Behind the Main Card */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/30 via-cyan-500/20 to-indigo-600/20 blur-2xl transform -rotate-1 scale-95 pointer-events-none" />

      {/* 1. CENTERPIECE: Live 1:1 WebRTC Coaching & Code Scratchpad Studio */}
      <div className="relative rounded-2xl border border-border/80 bg-slate-950/95 dark:bg-slate-950/90 text-slate-100 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 transition-all duration-300 hover:shadow-primary/20">
        {/* Window Top Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-500/90 inline-block" />
            <span className="size-2.5 rounded-full bg-amber-500/90 inline-block" />
            <span className="size-2.5 rounded-full bg-emerald-500/90 inline-block" />
            <span className="ml-2 font-mono text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Code2 className="size-3.5 text-primary" />
              python_async_raft.py
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE COACHING
            </div>
            <span className="font-mono text-[10px] text-slate-400 hidden sm:inline-block">
              00:42:18
            </span>
          </div>
        </div>

        {/* Video & Audio Telemetry Strip */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          {/* Specialist Box */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-primary text-white font-black text-xs shadow">
                AK
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">Dr. Ayra K.</span>
                <span className="block text-[10px] text-indigo-300 truncate font-medium">MIT · Staff Architect</span>
              </div>
            </div>
            {/* Audio Waveform */}
            <div className="flex items-end gap-0.5 h-5 px-1">
              <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-1" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-2" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-3" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-4" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-5" />
            </div>
          </div>

          {/* Student Box */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-xs shadow">
                AM
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">Alex M.</span>
                <span className="block text-[10px] text-cyan-300 truncate font-medium">Doctoral Researcher</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <Video className="size-3 text-cyan-400" />
              <Mic className="size-3 text-emerald-400" />
              <Monitor className="size-3 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Live Synchronized Code Scratchpad */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 font-mono text-xs leading-relaxed text-slate-300 overflow-hidden shadow-inner">
          <div className="text-[10px] text-slate-500 pb-1 flex justify-between select-none">
            <span>{"// Live Synchronized Proof & Implementation"}</span>
            <span className="text-emerald-400 font-bold">● Sync 14ms</span>
          </div>
          <pre className="overflow-x-auto text-[11px] sm:text-xs">
            <code>
              <span className="text-purple-400 font-bold">async def</span>{" "}
              <span className="text-cyan-400 font-semibold">commit_consensus_quorum</span>
              (term: <span className="text-amber-400">int</span>, log: <span className="text-amber-400">dict</span>):{"\n"}
              {"    "}<span className="text-slate-500"># Enforce Raft quorum across live nodes</span>{"\n"}
              {"    "}quorum = (<span className="text-emerald-400">len</span>(cluster.peers) // <span className="text-amber-300">2</span>) + <span className="text-amber-300">1</span>{"\n"}
              {"    "}acks = <span className="text-purple-400 font-bold">await</span> asyncio.<span className="text-cyan-400">gather</span>(*[{"\n"}
              {"        "}peer.<span className="text-blue-300">replicate</span>(term, log) <span className="text-purple-400">for</span> peer <span className="text-purple-400">in</span> cluster.nodes{"\n"}
              {"    "}])<span className="text-emerald-400 font-bold animate-pulse">|</span>{"\n"}
              {"    "}<span className="text-purple-400 font-bold">return</span> <span className="text-emerald-400">sum</span>(acks) &gt;= quorum
            </code>
          </pre>
        </div>

        {/* Studio Footer Indicator */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Radio className="size-3 animate-pulse text-primary" />
            <span>Encrypted WebRTC Mesh · Dual-Screen Shared</span>
          </div>
          <span className="text-emerald-400 font-mono font-bold">
            Zero Latency Audio · Opus 48kHz
          </span>
        </div>
      </div>

      {/* 2. FLOATING TOP-RIGHT BADGE: Smart AI Match Card */}
      <div className="absolute -top-6 -right-2 sm:-right-6 max-w-[240px] sm:max-w-[270px] rounded-2xl border border-indigo-400/40 bg-slate-900/95 text-white p-3 shadow-2xl backdrop-blur-xl animate-float ring-1 ring-white/10 z-20">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary-soft">
            <Sparkles className="size-3 text-cyan-400" />
            98% AI Match
          </span>
          <span className="flex items-center text-[10px] font-bold text-amber-400">
            <Star className="size-3 fill-amber-400 mr-0.5" /> 4.99
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center font-black text-xs text-white">
            AK
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Dr. Ayra K.</p>
            <p className="text-[10px] text-slate-400 truncate">142 Consultations</p>
          </div>
        </div>

        <Link
          href="/experts/ayra-k"
          className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:from-primary-strong hover:to-indigo-700 transition-all shadow-sm"
        >
          <span className="flex items-center gap-1">
            <Zap className="size-3 text-amber-300" /> Speed-Book 30m
          </span>
          <span className="font-mono text-cyan-200">$45</span>
        </Link>
      </div>

      {/* 3. FLOATING BOTTOM-LEFT BADGE: Audited Double-Entry Escrow Shield */}
      <div className="absolute -bottom-6 -left-2 sm:-left-6 max-w-[260px] sm:max-w-[290px] rounded-2xl border border-emerald-500/40 bg-slate-900/95 text-white p-3.5 shadow-2xl backdrop-blur-xl animate-float-delayed ring-1 ring-white/10 z-20">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <span className="block text-xs font-extrabold text-emerald-400">
              100% Escrow Protected
            </span>
            <span className="block text-[10px] text-slate-300">
              Double-Entry Invariant: <strong className="text-white">$0 Float</strong>
            </span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span>85% Specialist Net</span>
          <span className="text-cyan-300 font-semibold">Instant Vault Unlock</span>
        </div>
      </div>
    </div>
  );
}
