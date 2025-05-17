export type NotificationType = 'deadline' | 'new_process' | 'update' | 'admin' | 'system';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  link?: string;
  entityId?: number;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}