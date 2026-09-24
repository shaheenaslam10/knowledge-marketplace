/** Notification domain types — shapes mirror apps/notifications/api/views.py. */

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  category: string;
  label: string;
  email_enabled: boolean;
}
