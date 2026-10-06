"use client";

/**
 * Messages inbox — thread cards with unread counts (Phase 8, BR-34/35).
 * Live unread updates ride the notifications provider's refetch hints; the
 * list itself always renders server truth from REST.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Search,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { messagingApi } from "@/features/messaging/api";
import type { ThreadCard } from "@/features/messaging/types";
import { useRefetchOnFocus } from "@/features/messaging/use-thread-socket";

function relativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MessagesInboxPage() {
  const [threads, setThreads] = useState<ThreadCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const page = await messagingApi.list();
      setThreads(page.results);
      setError(null);
    } catch {
      setError("Could not load your conversations.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRefetchOnFocus(load);

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    return threads.filter(
      (t) =>
        t.counterpart.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.context_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.last_message.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [threads, searchQuery]);

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Marketplace Messages
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <ShieldCheck className="size-3" /> Secure & Moderated
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            End-to-end communication for active engagements, milestone clarification, and coordinator dispatch.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-1 border border-border/70 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger text-sm flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {threads === null && !error ? (
        <div className="space-y-3" data-testid="inbox-loading">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : null}

      {threads !== null && threads.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/80 bg-surface-1 space-y-3">
          <MessageSquare className="size-10 mx-auto text-muted/60" />
          <h3 className="text-sm font-semibold text-foreground">No conversations yet</h3>
          <p className="text-muted text-xs max-w-sm mx-auto">
            Conversations initiate automatically once an order is created, an expert offer is submitted, or a coordinator routes your task.
          </p>
        </div>
      ) : null}

      {threads !== null && threads.length > 0 && filteredThreads.length === 0 && (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80 bg-surface-1">
          <p className="text-sm font-medium text-foreground">No conversations match your search</p>
          <p className="text-xs text-muted mt-1">Try searching by participant name or order topic.</p>
        </div>
      )}

      <ul className="space-y-3">
        {filteredThreads.map((thread) => {
          const hasUnread = thread.unread > 0;

          return (
            <li key={thread.id}>
              <Link
                href={`/messages/${thread.id}`}
                className="group relative block rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="size-10 rounded-full bg-gradient-to-tr from-primary/20 via-primary/10 to-indigo-500/20 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {thread.counterpart.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {thread.counterpart}
                        </p>
                        {hasUnread && (
                          <span className="size-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="truncate text-xs font-semibold text-primary/80">
                        {thread.context_label}
                      </p>
                      <p className="truncate text-xs text-muted font-normal pt-0.5 max-w-lg">
                        {thread.last_message || "No messages yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                    <span className="text-[11px] text-muted font-mono">{relativeTime(thread.last_message_at)}</span>
                    <div className="flex items-center gap-1.5">
                      {hasUnread && (
                        <Badge tone="info" className="px-2 py-0.5 text-[10px] font-bold">
                          {thread.unread} new
                        </Badge>
                      )}
                      {thread.read_only && (
                        <Badge tone="neutral" className="text-[10px]">
                          Archived
                        </Badge>
                      )}
                      <ArrowRight className="size-3.5 text-muted group-hover:text-primary transition-colors ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
