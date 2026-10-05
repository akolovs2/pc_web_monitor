import { auth } from './auth';

import { API_URL } from '../config';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let res = await fetch(`${API_URL}${url}`, {
        ...options,
        credentials: 'include'
    });

    if (res.status === 401) {
        const refreshed = await auth.refresh();
        if (refreshed) {
            res = await fetch(`${API_URL}${url}`, {
                ...options,
                credentials: 'include'
            });
        } else {
            window.location.href = '/login';
        }
    }

    return res;
}

export interface MetricHistoryRecord {
    id?: number;
    timestamp: string;
    cpu: number;
    ram: number;
    storage: number;
    storage_used?: number;
    storage_total?: number;
    containers_count?: number;
    running_containers?: number;
}

export async function fetchMetricsHistory(range: string = "24h"): Promise<MetricHistoryRecord[]> {
    try {
        const res = await fetchWithAuth(`/metrics/history?range=${range}`);
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

export default fetchWithAuth;