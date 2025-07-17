import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { notificationsAPI } from '@/lib/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { 
  UserPlus, 
  Handshake, 
  MessageCircle, 
  Award, 
  Settings,
  X
} from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';

interface NotificationToastProps {
  onNotificationReceived?: () => void;
}

export const NotificationToast = ({ onNotificationReceived }: NotificationToastProps) => {
  const { toast } = useToast();
  const { lastNotificationId, refreshUnreadCount } = useNotifications();

  useEffect(() => {
    let lastCheckedId = lastNotificationId;
    let intervalId: NodeJS.Timeout;
    let isPageVisible = true;

    // Track page visibility to pause polling when user is away
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) {
        // Check immediately when page becomes visible
        checkForNewNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const checkForNewNotifications = async () => {
      // Only poll if page is visible
      if (!isPageVisible) return;
      
      try {
        const response = await notificationsAPI.getNotifications({ limit: 1 });
        const notifications = response.data.data || [];
        
        if (notifications.length > 0) {
          const latestNotification = notifications[0];
          
          // Only show toast for new notifications
          if (lastCheckedId !== latestNotification._id && !latestNotification.isRead) {
            lastCheckedId = latestNotification._id;
            
            const icon = getNotificationIcon(latestNotification.type);
            const action = getNotificationAction(latestNotification.type);
            
            toast({
              title: latestNotification.title,
              description: latestNotification.message,
              action: action,
              duration: 5000,
            });
            
            onNotificationReceived?.();
            // Refresh unread count when new notification appears
            refreshUnreadCount();
          }
        }
      } catch (error) {
        console.error('Failed to check for new notifications:', error);
      }
    };

    // Optimized polling: Check every 2 minutes instead of 10 seconds
    // Most notifications don't need immediate delivery
    const startPolling = () => {
      intervalId = setInterval(() => {
        if (isPageVisible) {
          checkForNewNotifications();
        }
      }, 120000); // Increased from 60s to 2 minutes
    };
    
    // Initial check only if we have a notification context ready
    if (lastNotificationId !== null) {
      checkForNewNotifications();
    }
    startPolling();

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastNotificationId, toast, onNotificationReceived, refreshUnreadCount]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'connection_accepted':
        return <Handshake className="w-4 h-4 text-green-500" />;
      case 'connection_rejected':
        return <X className="w-4 h-4 text-red-500" />;
      case 'new_message':
        return <MessageCircle className="w-4 h-4 text-purple-500" />;
      case 'achievement_unlocked':
        return <Award className="w-4 h-4 text-yellow-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationAction = (type: string) => {
    switch (type) {
      case 'connection_request':
        return (
          <ToastAction 
            altText="View connection request" 
            onClick={() => {
              // Navigate to connections page
              window.location.href = '#connect';
            }}
          >
            View
          </ToastAction>
        );
      case 'new_message':
        return (
          <ToastAction 
            altText="View message" 
            onClick={() => {
              // Navigate to messages
              window.location.href = '#connect';
            }}
          >
            View
          </ToastAction>
        );
      default:
        return undefined;
    }
  };

  return null; // This component doesn't render anything visible
}; 