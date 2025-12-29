import type { ProgressCardProps } from '../types/Metrics';
import getColor from '../utils/getColor';

const ProgressCard = ({ title, value }: ProgressCardProps) => {
    return (
        <div className="card">
            <h2>{title}</h2>
            <div className="progress-container">
                <div 
                    className="progress-bar" 
                    style={{ 
                        width: `${value}%`,
                        backgroundColor: getColor(value)
                    }}
                />
            </div>
            <p className="data">{value.toFixed(1)}%</p>
        </div>
    );
};

export default ProgressCard;