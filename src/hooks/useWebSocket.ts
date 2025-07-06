import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { ApiService } from '../lib/api';

export const useWebSocket = () => {
  const { user } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    // Create WebSocket connection
    const ws = ApiService.createWebSocketConnection(user.id);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
        
        // Handle different message types
        if (message.type === 'job_update') {
          useStore.getState().updateGenerationJob(message.job_id, message.data);
        } else if (message.type === 'agent_update') {
          // Handle agent status updates
          console.log('Agent update:', message);
        } else if (message.type === 'system_metrics') {
          // Handle system metrics updates
          console.log('System metrics:', message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  const sendMessage = (message: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
};