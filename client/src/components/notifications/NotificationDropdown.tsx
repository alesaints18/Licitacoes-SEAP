import React, { useState } from "react";
import { Bell, Calendar, FileText, UserPlus, RefreshCw, Info } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { Notification, NotificationType } from "@/types/notification";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onReadNotification: (id: string) => void;
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onClearAll,
  onReadNotification
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();
  
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "deadline":
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      case "new_process":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "update":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case "admin":
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case "system":
        return <Info className="h-4 w-4 text-gray-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };
  
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "deadline":
        return "border-l-yellow-500";
      case "new_process":
        return "border-l-green-500";
      case "update":
        return "border-l-blue-500";
      case "admin":
        return "border-l-purple-500";
      case "system":
        return "border-l-gray-500";
      default:
        return "border-l-gray-300";
    }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    onReadNotification(notification.id);
    setOpen(false);
    
    if (notification.link) {
      setLocation(notification.link);
    }
  };
  
  const unreadNotifications = notifications.filter(n => !n.read);
  const allNotifications = [...notifications];
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative p-2 rounded-full text-gray-500 hover:text-secondary-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          aria-label="Notificações"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <NotificationBadge 
              count={unreadCount} 
              variant="destructive" 
              className="animate-pulse"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-base">Notificações</h4>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                Marcar todas como lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearAll}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Limpar todas
              </Button>
            )}
          </div>
        </div>
        
        <Tabs defaultValue="unread">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="unread" className="relative">
              Não lidas
              {unreadCount > 0 && (
                <span className="ml-1 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="unread" className="space-y-0 mt-0">
            <ScrollArea className="h-[300px]">
              {unreadNotifications.length > 0 ? (
                unreadNotifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`border-l-4 ${getNotificationColor(notification.type)} p-3 hover:bg-muted/50 cursor-pointer`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { 
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhuma notificação não lida.</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="all" className="space-y-0 mt-0">
            <ScrollArea className="h-[300px]">
              {allNotifications.length > 0 ? (
                allNotifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`border-l-4 ${getNotificationColor(notification.type)} p-3 hover:bg-muted/50 cursor-pointer ${notification.read ? 'opacity-70 bg-muted/20' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${notification.read ? 'font-normal' : ''}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { 
                            addSuffix: true,
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center p-4">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhuma notificação disponível.</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}