import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../../services/auth';
import { Spinner } from '../../components';

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        auth.check().then((ok) => {
            setAuthenticated(ok);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <Spinner size="lg" />
            </div>
        );
    }

    if (authenticated) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default GuestRoute;