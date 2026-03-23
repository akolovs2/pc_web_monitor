import { auth } from './auth';

const API_URL = import.meta.env.VITE_API_URL;

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

export default fetchWithAuth;