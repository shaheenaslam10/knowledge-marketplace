"use client";
/**
 * Thread view — realtime via WS with optimistic send + REST fallback
 * (Phase 8 rules: WS is a hint; the DB is the source of truth; the page
 * refetches on reconnect/focus so it stays correct when the socket is down).
 */
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/SessionProvider";
import { messagingApi, uploadChatAttachment } from "@/features/messaging/api";
import { PolicyBanner, ReportMessageButton } from "@/features/messaging/moderation";
import { fileDownloadUrl } from "@/features/orders/api";
import type { ChatMessage, ThreadDetail } from "@/features/messaging/types";
import { useRefetchOnFocus, useThreadSocket, type ThreadSocketEvent } from "@/features/messaging/use-thread-socket";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const MAX_BODY_CHARS = 5000;

interface PendingMessage {
  tempId: string;
  body: string;
  attachmentName?: string;
}

export default function ThreadPage() {
  const params = useParams<{ threadId: string }>();
  const router = useRouter();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSession();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const detail = await messagingApi.detail(params.threadId);
      setThread(detail);
      setMessages(detail.messages);
      setPending([]); // DB truth supersedes optimistic copies after refetch
      setError(null);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) {
        setError("Conversation not found.");
      } else {
        setError("Could not load this conversation.");
      }
    }
  }, [params.threadId]);

  useEffect(() => {
    void load();
  }, [load]);
  useRefetchOnFocus(load);

  const onSocketEvent = useCallback(
    (event: ThreadSocketEvent) => {
      if (event.kind === "message") {
        void load(); // refetch hint — REST remains the source of truth
      } else if (event.kind === "typing") {
        setTypingName(event.userName);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingName(null), 2500);
      } else if (event.kind === "error") {
        setError(event.message);
        setPending([]);
      }
    },
    [load],
  );

  const { connected, generation, send } = useThreadSocket(params.threadId, onSocketEvent);

  // Re-fetch whenever the socket (re)connects — the refetch hint contract.
  useEffect(() => {
    if (generation > 0) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending.length]);

  const handleTyping = () => {
    send({ type: "typing" });
  };

  const sendDraft = async () => {
    const body = draft.trim();
    if (!body && !attachment) return;
    if (body.length > MAX_BODY_CHARS) {
      setError(`Messages are limited to ${MAX_BODY_CHARS.toLocaleString()} characters.`);
      return;
    }
    setError(null);
    const tempId = `pending-${Date.now()}`;
    setPending((current) => [
      ...current,
      { tempId, body, attachmentName: attachment?.name },
    ]);
    setDraft("");

    try {
      let attachmentId: string | undefined;
      if (attachment) {
        setUploading(true);
        attachmentId = await uploadChatAttachment(attachment);
        setAttachment(null);
      }
      if (send({ type: "message.send", body, attachment_id: attachmentId ?? null })) {
        // WS path: the consumer persists through the same service and the
        // broadcast comes back as a refetch hint — no REST duplicate.
      } else {
        // Offline fallback: REST persists directly (same service, same rules).
        await messagingApi.send(params.threadId, body, attachmentId);
        await load();
      }
    } catch (sendError) {
      setPending((current) => current.filter((message) => message.tempId !== tempId));
      setDraft((current) => (current ? current : body)); // restore text on failure
      setError(sendError instanceof Error ? sendError.message : "Message failed to send.");
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = async (message: ChatMessage) => {
    if (!message.attachment) return;
    try {
      const url = await fileDownloadUrl(message.attachment.id);
      window.open(url, "_blank", "noopener");
    } catch {
      setError("Could not open the attachment.");
    }
  };

  if (error && thread === null) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card className="text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={() => router.push("/messages")}>
            Back to inbox
          </Button>
        </Card>
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-3" data-testid="thread-loading">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-3/4" />
        <Skeleton className="h-24 w-2/3" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-3xl flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">{thread.context_label}</h1>
          <p className="flex items-center gap-2 text-xs text-muted">
            <span
              className={cn("inline-block size-1.5 rounded-full", connected ? "bg-success" : "bg-warning")}
              aria-hidden
            />
            {connected ? "Live" : "Offline — messages send over REST and sync on reconnect"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {thread.read_only && <Badge tone="neutral">Read-only (ended)</Badge>}
          <Button variant="ghost" size="sm" onClick={() => router.push("/messages")}>
            Inbox
          </Button>
        </div>
      </header>

      {(thread.context_type === "order" || thread.context_type === "dispute") && <PolicyBanner />}

      <div className="flex-1 space-y-3 overflow-y-auto py-4" data-testid="thread-messages">
        {messages.map((message) => {
          const mine = message.sender_id === user?.id;
          return (
            <div
              key={message.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
              data-sender={message.sender_id}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  mine ? "bg-primary text-primary-foreground" : "border border-border bg-surface",
                )}
              >
                {!mine && <p className="mb-0.5 text-xs font-semibold opacity-80">{message.sender_name}</p>}
                {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
                {message.attachment && (
                  <button
                    type="button"
                    className={cn(
                      "mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs underline-offset-2 hover:underline",
                      mine ? "bg-primary-strong/40" : "bg-surface-2",
                    )}
                    onClick={() => void openAttachment(message)}
                  >
                    📎 {message.attachment.original_name}
                  </button>
                )}
                <p className={cn("mt-1 text-right text-[10px]", mine ? "opacity-70" : "text-muted")}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <ReportMessageButton messageId={message.id} />
              </div>
            </div>
          );
        })}
        {pending.map((message) => (
          <div key={message.tempId} className="flex justify-end" data-testid="pending-message">
            <div className="max-w-[80%] rounded-2xl bg-primary/60 px-4 py-2.5 text-sm text-primary-foreground opacity-70">
              {message.body}
              {message.attachmentName && <p className="mt-1 text-xs">📎 {message.attachmentName} (uploading…)</p>}
              <p className="mt-1 text-right text-[10px] opacity-70">sending…</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {typingName && <p className="pb-1 text-xs italic text-muted">{typingName} is typing…</p>}

      {error && (
        <p className="pb-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      {thread.read_only ? (
        <p className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-center text-sm text-muted">
          This conversation is read-only — the order or request has ended (history is preserved).
        </p>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendDraft();
          }}
        >
          <div className="flex-1 space-y-1.5">
            <textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                handleTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendDraft();
                }
              }}
              rows={2}
              maxLength={MAX_BODY_CHARS + 100}
              placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              data-testid="message-input"
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <label className="cursor-pointer hover:text-foreground">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                />
                {attachment ? `📎 ${attachment.name}` : "📎 Attach file (pdf/png/jpg/txt ≤ 5 MB)"}
              </label>
              <span>{draft.length}/{MAX_BODY_CHARS}</span>
            </div>
          </div>
          <Button type="submit" disabled={uploading || (!draft.trim() && !attachment)} data-testid="send-button">
            {uploading ? "Sending…" : "Send"}
          </Button>
        </form>
      )}
    </div>
  );
}
