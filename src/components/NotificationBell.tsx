import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell = ({ className }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, markAllAsRead, isLoading, refreshUnreadCount } = useNotifications();

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (unreadCount > 0) {
      // Mark all as read when opening
      handleMarkAllAsRead();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  return (
    <div className={`relative inline-block ${className || ""}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBellClick}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        disabled={isLoading}
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
            onNotificationUpdate={refreshUnreadCount}
          />
        </div>
      )}
    </div>
  );
}; 