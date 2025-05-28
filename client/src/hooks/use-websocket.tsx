import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Estabelecer conexão WebSocket
  useEffect(() => {
    const connect = () => {
      try {
        // Determinar o protocolo correto (ws ou wss) baseado no protocolo da página
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log('Tentando conectar ao WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('Conexão WebSocket estabelecida');
          setIsConnected(true);
          setSocket(ws);
        };
        
        ws.onclose = () => {
          console.log('Conexão WebSocket fechada');
          setIsConnected(false);
          setSocket(null);
          
          // Tentar reconectar em 5 segundos
          setTimeout(connect, 5000);
        };
        
        ws.onerror = (error) => {
          console.error('Erro na conexão WebSocket:', error);
          ws.close();
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Mensagem WebSocket recebida:', data);
            
            // Verificar se os dados são válidos antes de processar
            if (data && typeof data === 'object') {
              handleWebSocketMessage(data);
            }
          } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
          }
        };
        
        return ws;
      } catch (error) {
        console.error('Erro ao criar conexão WebSocket:', error);
        return null;
      }
    };
    
    const ws = connect();
    
    // Limpar conexão ao desmontar o componente
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);
  
  // Função para processar as mensagens recebidas
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'connection':
        console.log('Conexão WebSocket confirmada:', data.message);
        break;
        
      case 'new_process':
        // Invalidar cache de processos para refletir o novo processo
        queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
        
        // Mostrar notificação
        toast({
          title: 'Novo Processo',
          description: data.message,
          duration: 5000,
        });
        
        // Atualizar estatísticas do dashboard
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/process-statistics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/processes-by-month'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/processes-by-source'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/processes-by-responsible'] });
        break;
        
      case 'process_updated':
        // Similar ao caso anterior, mas para atualizações
        queryClient.invalidateQueries({ queryKey: ['/api/processes'] });
        if (data.processId) {
          queryClient.invalidateQueries({ queryKey: [`/api/processes/${data.processId}`] });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/process-statistics'] });
        
        if (data.message) {
          toast({
            title: 'Processo Atualizado',
            description: data.message,
            duration: 5000,
          });
        }
        break;
        
      case 'user_created':
        // Invalidar cache de usuários
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        
        toast({
          title: 'Novo Usuário',
          description: data.message,
          duration: 5000,
        });
        break;
        
      default:
        console.log('Mensagem não tratada:', data);
    }
  }, [toast]);
  
  // Função para enviar mensagens
  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('Não foi possível enviar mensagem: WebSocket não conectado');
    }
  }, [socket, isConnected]);
  
  return { isConnected, sendMessage };
}