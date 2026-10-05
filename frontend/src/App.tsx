import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Metrics from './pages/Metrics';
import TerminalPage from './pages/Terminal';
import ProtectedRoute from './features/auth/ProtectedRoute';
import GuestRoute from './features/auth/GuestRoute';
import NotFound from './pages/NotFound';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <GuestRoute>
                            <Login />
                        </GuestRoute>
                    }
                />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Metrics />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/terminal"
                    element={
                        <ProtectedRoute>
                            <TerminalPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;