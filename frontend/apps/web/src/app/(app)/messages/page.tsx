"use client";
/**
 * Messages inbox — thread cards with unread counts (Phase 8, BR-34/35).
 * Live unread updates ride the notifications provider's refetch hints; the
 * list itself always renders server truth from REST.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted">
            All project conversations live here — keep communication on-platform (BR-34).
          </p>
        </div>
      </header>

      {error && (
        <Card className="border-danger/40">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {threads === null && !error ? (
        <div className="space-y-3" data-testid="inbox-loading">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}

      {threads !== null && threads.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm font-medium">No conversations yet</p>
          <p className="mt-1 text-sm text-muted">
            Message threads open from an order or an accepted request — look for the “Message” button
            there.
          </p>
        </Card>
      ) : null}

      <ul className="space-y-3">
        {(threads ?? []).map((thread) => (
          <li key={thread.id}>
            <Link href={`/messages/${thread.id}`} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Card className="transition-colors hover:border-primary/40 hover:bg-surface-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{thread.counterpart}</p>
                    <p className="truncate text-xs text-muted">{thread.context_label}</p>
                    <p className="mt-1 truncate text-sm text-muted">{thread.last_message || "No messages yet"}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-xs text-muted">{relativeTime(thread.last_message_at)}</span>
                    {thread.unread > 0 && <Badge tone="info">{thread.unread} new</Badge>}
                    {thread.read_only && <Badge tone="neutral">read-only</Badge>}
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
