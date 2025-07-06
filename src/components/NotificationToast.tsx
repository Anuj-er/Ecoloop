import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { notificationsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    let lastNotificationId: string | null = null;

    const checkForNewNotifications = async () => {
      try {
        const response = await notificationsAPI.getNotifications({ limit: 1 });
        const notifications = response.data.data || [];
        
        if (notifications.length > 0) {
          const latestNotification = notifications[0];
          
          // Only show toast for new notifications
          if (lastNotificationId !== latestNotification._id && !latestNotification.isRead) {
            lastNotificationId = latestNotification._id;
            
            const icon = getNotificationIcon(latestNotification.type);
            const action = getNotificationAction(latestNotification.type);
            
            toast({
              title: latestNotification.title,
              description: latestNotification.message,
              action: action,
              duration: 5000,
            });
            
            onNotificationReceived?.();
          }
        }
      } catch (error) {
        console.error('Failed to check for new notifications:', error);
      }
    };

    // Check for new notifications every 10 seconds
    const interval = setInterval(checkForNewNotifications, 10000);
    
    // Initial check
    checkForNewNotifications();

    return () => clearInterval(interval);
  }, [isAuthenticated, toast, onNotificationReceived]);

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