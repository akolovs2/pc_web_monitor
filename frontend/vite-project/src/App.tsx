// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Metrics from './pages/Metrics';
import ProtectedRoute from './features/auth/ProtectedRoute';
import './styles/App.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <Metrics />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App;