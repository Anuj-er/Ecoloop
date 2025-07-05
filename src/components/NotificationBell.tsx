import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notificationsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell = ({ className }: NotificationBellProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (unreadCount > 0) {
      // Mark all as read when opening
      markAllAsRead();
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationsAPI.markAllAsRead();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className || ""}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBellClick}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        disabled={loading}
      >
        {unreadCount > 0 ? (
          <Bell className="w-5 h-5 text-blue-600" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-500" />
        )}
        
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-50">
          <NotificationPanel 
            onClose={() => setIsOpen(false)}
            onNotificationUpdate={loadUnreadCount}
          />
        </div>
      )}
    </div>
  );
}; 