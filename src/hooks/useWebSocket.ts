import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export const useWebSocket = () => {
  const { user, isGuest } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const clientId = user?.id || (isGuest ? 'guest_user' : 'anonymous');
    const wsUrl = `ws://127.0.0.1:8000/ws/${clientId}`;  // Use 127.0.0.1 to match backend
    
    console.log('🔌 Attempting WebSocket connection to:', wsUrl);
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📩 WebSocket message received:', message.type);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'generation_progress':
              console.log('🔄 Generation progress:', message.data);
              break;
            case 'generation_update':
              // Enhanced logging for development and debugging
              const { step, progress, message: msg } = message.data;
              
              // Console logging for developers
              if (import.meta.env.DEV) {
                if (msg.includes('Gemini 2.0 Flash') || msg.includes('GEMINI')) {
                  console.log(`🤖 GEMINI ACTIVE: [${progress}%] ${msg}`);
                } else if (msg.includes('fallback') || msg.includes('FALLBACK')) {
                  console.log(`🏠 FALLBACK MODE: [${progress}%] ${msg}`);
                } else if (msg.includes('batch') || msg.includes('parsing')) {
                  console.log(`⚙️ GEMINI PROCESSING: [${progress}%] ${msg}`);
                } else if (msg.includes('Agent') || msg.includes('AGENT')) {
                  console.log(`🤖 AI AGENT: [${progress}%] ${msg}`);
                } else {
                  console.log(`📊 PROCESS: [${progress}%] ${msg}`);
                }
              }
              
              // Store detailed update for UI components
              setLastMessage({
                ...message,
                data: {
                  ...message.data,
                  isGeminiActive: msg.includes('Gemini 2.0 Flash') || msg.includes('GEMINI'),
                  isFallback: msg.includes('fallback') || msg.includes('FALLBACK'),
                  isAgent: msg.includes('Agent') || msg.includes('AGENT'),
                  timestamp: Date.now()
                }
              });
              break;
            case 'agent_status':
              console.log('🤖 Agent status update:', message.data);
              break;
            case 'connection_established':
              console.log('🎉 Connection established:', message.client_id);
              break;
            case 'pong':
              // Heartbeat response
              break;
            default:
              console.log('📨 Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect after 3 seconds unless it was a clean close
        if (event.code !== 1000 && event.code !== 1001) {
          console.log('🔄 Attempting to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        setIsConnected(false);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && isConnected) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('📤 WebSocket message sent:', message.type);
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  };

  useEffect(() => {
    // Connect when user is available
    if (user || isGuest) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [user, isGuest]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
};