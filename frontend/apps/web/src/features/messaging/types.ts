/** Messaging domain types — shapes mirror apps/messaging/api/views.py. */

export type ThreadContextType = "order" | "request" | "dispute";

export interface ThreadCard {
  id: string;
  context_type: ThreadContextType;
  context_label: string;
  counterpart: string;
  last_message: string;
  last_message_at: string;
  unread: number;
  read_only: boolean;
}

export interface MessageAttachmentRef {
  id: string;
  original_name: string;
}

/** Wire shape shared by the REST detail and the WS broadcast (one contract). */
export interface ChatMessage {
  id: string;
  sender_id: number;
  sender_name: string;
  body: string;
  created_at: string;
  attachment: MessageAttachmentRef | null;
}

export interface ThreadDetail {
  id: string;
  context_type: ThreadContextType;
  context_label: string;
  read_only: boolean;
  messages: ChatMessage[];
}
