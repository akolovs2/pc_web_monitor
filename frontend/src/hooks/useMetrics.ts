import { useState, useEffect, useRef } from 'react';
import type { MetricsData, ContainerActionType } from '../types/Metrics';
import { fetchWithAuth } from '../services/api';

import { WS_URL } from '../config';

const initialData: MetricsData = {
    hostname: '',
    cpu: 0,
    ram: 0,
    tasks: [],
    containers: []
};

export function useMetrics() {
    const [data, setData] = useState<MetricsData>(initialData);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}/ws`);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onmessage = (event) => {
            setData(JSON.parse(event.data));
        };

        return () => ws.close();
    }, []);

    // Deprecated module for now, but may be used in the future for more complex interactions
    const killTask = async (pid: number, name: string): Promise<{ success: boolean; message?: string }> => {
        if (!confirm(`Kill "${name}" (PID: ${pid})?`)) {
            return { success: false };
        }

        try {
            const res = await fetchWithAuth(`/tasks/${pid}`, { method: 'DELETE' });
            const result = await res.json();
            if (!result.success) {
                alert(result.message);
            }
            return result;
        } catch (e) {
            alert(`Failed to kill task: ${e}`);
            return { success: false };
        }
    };

    const containerAction = async (name: string, action: ContainerActionType): Promise<{ success: boolean; message?: string }> => {
        try {
            const res = await fetchWithAuth(`/docker/containers/${name}/${action}`, { method: 'POST' });
            const result = await res.json();
            return result;
        } catch (e) {
            console.error(`Failed to ${action} container:`, e);
            return { success: false, message: String(e) };
        }
    };

    return { data, killTask, containerAction, isConnected };
}