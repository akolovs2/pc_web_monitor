import type { ProgressCardProps } from '../../types/Metrics';
import { ProgressBar } from '../../components';

const ProgressCard = ({ title, value }: ProgressCardProps) => {
    return (
        <div className="card">
            <h2>{title}</h2>
            <ProgressBar value={value} size="md" />
            <p className="data">{value.toFixed(1)}%</p>
        </div>
    );
};

export default ProgressCard;