import { AppNotification, NotificationType } from '../../src/types';
import { db } from '../data/store';

export class NotificationService {
  /**
   * Dispatches an in-app notification to a user.
   */
  async notify(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<AppNotification> {
    const notification: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
      is_read: false,
      created_at: new Date().toISOString()
    };

    db.notifications.set(notification.id, notification);
    return notification;
  }

  /**
   * Retrieves notifications for a given user ordered newest first.
   */
  getUserNotifications(userId: string): AppNotification[] {
    return Array.from(db.notifications.values())
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Marks a notification as read.
   */
  markAsRead(notificationId: string, userId: string): boolean {
    const notif = db.notifications.get(notificationId);
    if (notif && notif.user_id === userId) {
      notif.is_read = true;
      db.notifications.set(notif.id, notif);
      return true;
    }
    return false;
  }

  /**
   * Marks all notifications as read for a user.
   */
  markAllAsRead(userId: string): number {
    let count = 0;
    for (const notif of db.notifications.values()) {
      if (notif.user_id === userId && !notif.is_read) {
        notif.is_read = true;
        db.notifications.set(notif.id, notif);
        count++;
      }
    }
    return count;
  }
}

export const notificationService = new NotificationService();
