"use client";

import {
  Calendar,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Lock,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";

const TICKER_ITEMS = [
  { icon: ShieldCheck, text: "Double-Entry Escrow Ledger ($0 Float)", color: "text-emerald-500" },
  { icon: DollarSign, text: "85% Specialist Net Payout Guaranteed", color: "text-amber-500" },
  { icon: Video, text: "$0 SaaS Video & Scratchpad Fees", color: "text-cyan-500" },
  { icon: Calendar, text: "RFC 5545 Live Calendar Sync", color: "text-indigo-500" },
  { icon: Receipt, text: "Official Printable Tax Invoices & VAT", color: "text-purple-500" },
  { icon: Lock, text: "72-Hour Milestone Inspection Window", color: "text-rose-500" },
  { icon: Zap, text: "Instant 30m/60m WebRTC Speed-Booking", color: "text-amber-400" },
  { icon: Scale, text: "48-Hour Binding Human Arbitration", color: "text-blue-500" },
  { icon: CheckCircle2, text: "Zero Ghostwriting Honor Code (BR-34)", color: "text-emerald-400" },
];

export function LivePlatformTicker() {
  return (
    <div className="relative w-full overflow-hidden border-y border-border/80 bg-surface/60 py-3 backdrop-blur-md">
      {/* Edge gradient masks */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

      <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
        {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs font-semibold text-foreground/80 hover:text-foreground transition-colors shrink-0"
          >
            <item.icon className={`size-3.5 shrink-0 ${item.color}`} />
            <span>{item.text}</span>
            <span className="text-muted/40 font-mono text-[11px] ml-4">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}

