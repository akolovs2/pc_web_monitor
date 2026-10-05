import { API_URL } from '../config';

export interface LoginParams {
    username: string;
    password?: string;
    sshKey?: string;
    passphrase?: string;
}

export const auth = {
    async login({ username, password, sshKey, passphrase }: LoginParams) {
        const payload: {
            username: string;
            password?: string;
            ssh_key?: string;
            passphrase?: string;
            auth_type: 'password' | 'ssh_key';
        } = {
            username: username.trim(),
            auth_type: sshKey ? 'ssh_key' : 'password',
        };

        if (password) payload.password = password;
        if (sshKey) payload.ssh_key = sshKey;
        if (passphrase) payload.passphrase = passphrase;

        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            const message = errorData?.detail || 'Authentication failed. Please verify your credentials.';
            throw new Error(message);
        }

        return res.json();
    },

    async refresh() {
        try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });
            return res.ok;
        } catch {
            return false;
        }
    },

    async logout() {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } finally {
            window.location.href = '/login';
        }
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