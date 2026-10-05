export const INITIAL_LIST_COUNT = 10;
export const LIST_INCREMENT = 10;

const defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
const defaultWsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';

// Dynamic API & WebSocket URLs: use VITE_* env vars if provided, otherwise auto-fallback to host:8080 (Nginx Gateway)
export const API_URL = (import.meta.env.VITE_API_URL || `${defaultProtocol}//${defaultHost}:8080`).replace(/\/+$/, '');
export const WS_URL = (import.meta.env.VITE_WS_POOL_API || `${defaultWsProtocol}//${defaultHost}:8080`).replace(/\/+$/, '');