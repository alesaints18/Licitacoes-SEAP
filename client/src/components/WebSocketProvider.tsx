import { createContext, ReactNode, useContext, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { queryClient } from '@/lib/queryClient';

// Contexto do WebSocket
const WebSocketContext = createContext<ReturnType<typeof useWebSocket> | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const websocketState = useWebSocket();
  
  return (
    <WebSocketContext.Provider value={websocketState}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook para usar o websocket
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext deve ser usado dentro de um WebSocketProvider');
  }
  return context;
}