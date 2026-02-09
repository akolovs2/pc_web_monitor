// src/services/auth.ts
const API_URL = import.meta.env.VITE_API_URL;

export const auth = {
    async login(username: string, password: string) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Invalid credentials');
        return res.json();
    },

    async refresh() {
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
        });
        return res.ok;
    },

    async logout() {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = '/login';
    },

    async check() {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                credentials: 'include'
            });
            if (res.ok) return true;
            if (res.status === 401) {
                return await this.refresh();
            }
            return false;
        } catch {
            return false;
        }
    },

    async getUsername() {
        try {
            const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                return data.username;
            }
            return null;
        } catch {
            return null;
        }
    }
};

export default auth;