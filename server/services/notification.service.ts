import { AppNotification, NotificationType } from '../../src/types';
import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';

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
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data || {},
          is_read: false,
          created_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        is_read: data.is_read,
        created_at: data.created_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Retrieves notifications for a given user ordered newest first.
   */
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AppNotification[];
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Marks a notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const supabase = getRequiredSupabase();

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('id');

      if (error) throw error;
      return (data || []).length;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const notificationService = new NotificationService();
