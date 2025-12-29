// hooks/useMetrics.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { MetricsData } from '../types/Metrics';
import { WS_URL, API_URL } from '../config';

export const useMetrics = () => {
    const [data, setData] = useState<MetricsData>({ 
        cpu: 0, 
        ram: 0, 
        services: [], 
        tasks: [] 
    });
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!isMountedRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!isMountedRef.current) {
                ws.close();
                return;
            }
            console.log("Connected");
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            if (isMountedRef.current) {
                setData(JSON.parse(event.data));
            }
        };

        ws.onerror = () => {
            // Silent in dev mode — StrictMode causes this
        };

        ws.onclose = () => {
            if (!isMountedRef.current) return;
            
            console.log("Disconnected, reconnecting...");
            setIsConnected(false);
            wsRef.current = null;
            
            reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
        };
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        connect();

        return () => {
            isMountedRef.current = false;
            
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent reconnect on cleanup
                wsRef.current.close();
            }
        };
    }, [connect]);

    const killTask = async (pid: number, name: string): Promise<boolean> => {
        if (!confirm(`Kill ${name} (PID: ${pid})?`)) return false;
        
        try {
            const response = await fetch(`${API_URL}/tasks/kill/${pid}`, {
                method: 'POST'
            });
            const result = await response.json();
            
            if (!result.success) {
                alert(result.message);
                return false;
            }
            return true;
        } catch (error) {
            alert('Failed to kill process');
            return false;
        }
    };

    return { data, isConnected, killTask };
};