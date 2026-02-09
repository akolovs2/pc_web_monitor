// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/auth';
import { Button, Input } from '../components';
import '../styles/Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await auth.login(username, password);
            navigate('/');
        } catch {
            setError('Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <h1>Login</h1>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleSubmit}>
                 <Input
                    label="Username"
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <Input
                    label="Password"
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <Button type="submit" loading={loading} style={{ width: '100%' }}>
                    Continue
                </Button>
            </form>
        </div>
    );
};

export default Login;