import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { notificationsAPI } from '@/lib/api';

interface NotificationContextType {
  unreadCount: number;
  lastNotificationId: string | null;
  refreshUnreadCount: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setLastNotificationId(null);
      return;
    }

    let intervalId: NodeJS.Timeout;
    let isPageVisible = true;

    // Track page visibility to pause polling when user is away
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        // Refresh immediately when page becomes visible
        refreshUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const startPolling = () => {
      // Optimized polling: every 3 minutes for unread count
      intervalId = setInterval(() => {
        if (isPageVisible) {
          refreshUnreadCount();
        }
      }, 180000); // 3 minutes
    };

    // Initial load
    refreshUnreadCount();
    startPolling();

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  const refreshUnreadCount = async () => {
    if (!isAuthenticated || isLoading) return;

    try {
      setIsLoading(true);
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
      
      // Also get the latest notification ID for toast comparison
      const notificationsResponse = await notificationsAPI.getNotifications({ limit: 1 });
      const notifications = notificationsResponse.data.data || [];
      if (notifications.length > 0) {
        setLastNotificationId(notifications[0]._id);
      }
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      await notificationsAPI.markAllAsRead();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: NotificationContextType = {
    unreadCount,
    lastNotificationId,
    refreshUnreadCount,
    markAllAsRead,
    isLoading
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
