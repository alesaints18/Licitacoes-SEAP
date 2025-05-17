import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { 
  Notification, 
  NotificationState, 
  NotificationType 
} from "@/types/notification";
import { generateId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useInterval } from "./use-interval";
import { useQuery } from "@tanstack/react-query";

// API simulada - no futuro pode ser substituída por chamadas reais à API
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Processo próximo do prazo",
    message: "O processo PB123456 vence em 3 dias",
    type: "deadline",
    read: false,
    createdAt: new Date(Date.now() - 3600000),
    link: "/processes/123",
    entityId: 123
  },
  {
    id: "2",
    title: "Novo processo criado",
    message: "Processo PB345678 foi criado por João Silva",
    type: "new_process",
    read: false,
    createdAt: new Date(Date.now() - 7200000),
    link: "/processes/234",
    entityId: 234
  },
  {
    id: "3",
    title: "Atualização de processo",
    message: "O processo PB567890 foi atualizado para status 'Em andamento'",
    type: "update",
    read: false,
    createdAt: new Date(Date.now() - 10800000),
    link: "/processes/345",
    entityId: 345
  },
  {
    id: "4",
    title: "Novo usuário aguardando aprovação",
    message: "Maria Oliveira solicitou acesso ao sistema",
    type: "admin",
    read: false,
    createdAt: new Date(Date.now() - 14400000),
    link: "/users",
  },
  {
    id: "5",
    title: "Manutenção do sistema",
    message: "O sistema estará indisponível amanhã das 22h às 23h para manutenção",
    type: "system",
    read: true,
    createdAt: new Date(Date.now() - 86400000),
  }
];

// Intervalo para verificar novos processos com prazo próximo (15 minutos)
const CHECK_DEADLINES_INTERVAL = 15 * 60 * 1000;

// Contexto para gerenciar o estado das notificações
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NotificationState>({
    notifications: [...MOCK_NOTIFICATIONS],
    unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.read).length
  });
  
  const { toast } = useToast();
  
  // Buscar processos
  const { data: processes } = useQuery({
    queryKey: ['/api/processes'],
    refetchOnWindowFocus: false,
  });
  
  // Verificar processos com prazo próximo
  useInterval(() => {
    checkDeadlines();
  }, CHECK_DEADLINES_INTERVAL);
  
  // Função para verificar processos com prazo próximo
  const checkDeadlines = () => {
    if (!processes || !Array.isArray(processes)) return;
    
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    // Verificar processos com passos que vencem em até 3 dias
    processes.forEach(process => {
      if (process.steps && Array.isArray(process.steps)) {
        process.steps.forEach((step: any) => {
          if (step.dueDate && !step.isCompleted) {
            const dueDate = new Date(step.dueDate);
            
            if (dueDate <= threeDaysFromNow && dueDate >= today) {
              // Verificar se já existe notificação para este passo
              const existingNotification = state.notifications.find(
                n => n.type === "deadline" && n.entityId === step.id
              );
              
              if (!existingNotification) {
                // Criar nova notificação
                addNotification({
                  title: `Prazo próximo: ${process.pbdocNumber}`,
                  message: `O passo "${step.stepName}" vence em ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} dias`,
                  type: "deadline",
                  link: `/processes/${process.id}`,
                  entityId: step.id
                });
              }
            }
          }
        });
      }
    });
  };
  
  // Efeito para carregar notificações salvas no localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        
        // Converter strings de data para objetos Date
        const notifications = parsed.notifications.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }));
        
        setState({
          notifications,
          unreadCount: notifications.filter((n: Notification) => !n.read).length
        });
      } catch (e) {
        console.error("Erro ao carregar notificações do localStorage:", e);
      }
    }
    
    // Verificar prazos na inicialização
    checkDeadlines();
  }, []);
  
  // Salvar notificações no localStorage quando o estado mudar
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify({
      notifications: state.notifications
    }));
  }, [state]);
  
  // Função para marcar uma notificação como lida
  const markAsRead = (id: string) => {
    setState(prevState => {
      const updatedNotifications = prevState.notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      );
      
      return {
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length
      };
    });
  };
  
  // Função para marcar todas as notificações como lidas
  const markAllAsRead = () => {
    setState(prevState => ({
      notifications: prevState.notifications.map(notification => ({
        ...notification,
        read: true
      })),
      unreadCount: 0
    }));
  };
  
  // Função para adicionar uma nova notificação
  const addNotification = (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      createdAt: new Date(),
      read: false
    };
    
    setState(prevState => ({
      notifications: [newNotification, ...prevState.notifications],
      unreadCount: prevState.unreadCount + 1
    }));
    
    // Mostrar toast para notificação
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
    });
  };
  
  // Referência para armazenar o último count conhecido
  const processCountRef = React.useRef<number>(0);
  const userCountRef = React.useRef<number>(0);
  
  // Buscar usuários
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    refetchOnWindowFocus: false,
  });
  
  // Adicionar observadores para eventos no sistema
  useEffect(() => {
    if (!processes || !Array.isArray(processes)) return;
    
    const currentCount = processes.length;
    
    // Verificar se é a primeira carga
    if (processCountRef.current === 0) {
      processCountRef.current = currentCount;
      return;
    }
    
    // Se temos mais processos do que antes, novos foram adicionados
    if (currentCount > processCountRef.current) {
      // Encontrar os novos processos
      const newProcesses = processes
        .slice(0, currentCount - processCountRef.current)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Gerar notificações para novos processos
      newProcesses.forEach((process: any) => {
        addNotification({
          title: "Novo processo criado",
          message: `O processo ${process.pbdocNumber} foi adicionado ao sistema`,
          type: "new_process",
          link: `/processes/${process.id}`,
          entityId: process.id
        });
      });
    }
    
    // Atualizar a referência
    processCountRef.current = currentCount;
  }, [processes]);
  
  // Monitorar mudanças em usuários
  useEffect(() => {
    if (!users || !Array.isArray(users)) return;
    
    const currentCount = users.length;
    
    // Verificar se é a primeira carga
    if (userCountRef.current === 0) {
      userCountRef.current = currentCount;
      return;
    }
    
    // Se temos mais usuários do que antes, novos foram adicionados
    if (currentCount > userCountRef.current) {
      // Encontrar os novos usuários, presumindo que estão no começo do array
      const newUsers = users
        .slice(0, currentCount - userCountRef.current)
        .sort((a, b) => b.id - a.id); // Presumindo que IDs mais altos são mais recentes
      
      // Gerar notificações para novos usuários
      newUsers.forEach((user: any) => {
        addNotification({
          title: "Novo usuário registrado",
          message: `${user.fullName} (${user.username}) se registrou no sistema`,
          type: "admin",
          link: `/users`,
        });
      });
    }
    
    // Atualizar a referência
    userCountRef.current = currentCount;
  }, [users]);
  
  return (
    <NotificationContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Extraindo o hook em uma variável constante para evitar problemas com Fast Refresh
const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error("useNotifications deve ser usado dentro de um NotificationProvider");
  }
  
  return context;
}

export { useNotifications };