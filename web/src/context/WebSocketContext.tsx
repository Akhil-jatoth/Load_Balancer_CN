import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ProxyEvent } from '../types';
import { useToast } from '../components/ui/Toast';

interface WebSocketContextType {
  connected: boolean;
  latestEvent: ProxyEvent | null;
  recentEvents: ProxyEvent[];
  clearEvents: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [latestEvent, setLatestEvent] = useState<ProxyEvent | null>(null);
  const [recentEvents, setRecentEvents] = useState<ProxyEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const { warning, error, success } = useToast();

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '5173' ? '127.0.0.1:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/live`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onclose = () => {
        setConnected(false);
        // Exponential reconnect
        reconnectTimeoutRef.current = window.setTimeout(connect, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data && data.type) {
            if (data.type === 'CONNECTED' || data.type === 'PONG') return;

            const event = data as ProxyEvent;
            setLatestEvent(event);
            setRecentEvents((prev) => [event, ...prev.slice(0, 99)]);

            // Proactive alerting
            if (event.type === 'BACKEND_STATE_CHANGE') {
              if (event.details?.includes('DOWN')) {
                error('Backend Failure Detected', event.details);
              } else {
                success('Backend Restored', event.details);
              }
            } else if (event.type === 'RATE_LIMIT_BLOCKED') {
              warning('Rate Limit Exceeded', `${event.clientIp} was blocked (429)`);
            }
          }
        } catch {}
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [error, success, warning]);

  const clearEvents = () => {
    setRecentEvents([]);
  };

  return (
    <WebSocketContext.Provider value={{ connected, latestEvent, recentEvents, clearEvents }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
  return ctx;
};
