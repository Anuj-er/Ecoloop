import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, 
  Trash2, 
  Check, 
  MessageCircle, 
  Handshake, 
  UserPlus, 
  Award, 
  Settings,
  Filter,
  Loader2,
  Bell
} from 'lucide-react';
import { notificationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
  sender: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  category: string;
  priority: string;
  data: any;
}

interface NotificationPanelProps {
  onClose: () => void;
  onNotificationUpdate: () => void;
}

export const NotificationPanel = ({ onClose, onNotificationUpdate }: NotificationPanelProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter !== 'all') {
        if (filter === 'unread') params.isRead = 'false';
        else if (filter === 'read') params.isRead = 'true';
        else params.category = filter;
      }
      
      const response = await notificationsAPI.getNotifications(params);
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast({
        title: "Failed to load notifications",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      onNotificationUpdate();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      onNotificationUpdate();
      toast({
        title: "Notification deleted",
        description: "The notification has been removed.",
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: "Failed to delete notification",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      await notificationsAPI.deleteAllNotifications();
      setNotifications([]);
      onNotificationUpdate();
      toast({
        title: "All notifications deleted",
        description: "All notifications have been removed.",
      });
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      toast({
        title: "Failed to delete notifications",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social':
        return 'bg-blue-100 text-blue-800';
      case 'business':
        return 'bg-green-100 text-green-800';
      case 'system':
        return 'bg-purple-100 text-purple-800';
      case 'achievement':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-[350px] max-h-[70vh] overflow-y-auto shadow-xl rounded-xl border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Notifications</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" onClick={() => setFilter('all')}>
              All
            </TabsTrigger>
            <TabsTrigger value="unread" onClick={() => setFilter('unread')}>
              Unread
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-2 p-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 rounded-lg border transition-colors ${
                        notification.isRead 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={notification.sender?.avatar} />
                          <AvatarFallback className="text-sm">
                            {notification.sender?.firstName?.[0]}{notification.sender?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {getNotificationIcon(notification.type)}
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {notification.timeAgo}
                            </span>
                            <div className="flex items-center space-x-1">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification._id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNotification(notification._id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mb-2" />
                  <p>No notifications found</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="unread" className="mt-0">
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : notifications.filter(n => !n.isRead).length > 0 ? (
                <div className="space-y-2 p-4">
                  {notifications.filter(n => !n.isRead).map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 rounded-lg border transition-colors bg-blue-50 border-blue-200`}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={notification.sender?.avatar} />
                          <AvatarFallback className="text-sm">
                            {notification.sender?.firstName?.[0]}{notification.sender?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {getNotificationIcon(notification.type)}
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {notification.timeAgo}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification._id)}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNotification(notification._id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Check className="w-12 h-12 mb-2" />
                  <p>No unread notifications</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 