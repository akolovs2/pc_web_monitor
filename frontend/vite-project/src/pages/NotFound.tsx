import { useNavigate } from 'react-router-dom';
import { Button } from '../components';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-page">
            <h1>404</h1>
            <p>Page not found</p>

            <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
    );
};

export default NotFound;