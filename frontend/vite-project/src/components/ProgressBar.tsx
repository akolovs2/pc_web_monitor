import '../styles/ui.css';

interface ProgressBarProps {
    value: number;
    color?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const getDefaultColor = (value: number): string => {
    if (value < 50) return '#4caf50';
    if (value < 80) return '#ff9800';
    return '#f44336';
};

const ProgressBar = ({ 
    value, 
    color, 
    showLabel = false,
    size = 'md' 
}: ProgressBarProps) => (
    <div className="progress-wrapper">
        <div className={`progress-container progress-${size}`}>
            <div 
                className="progress-bar" 
                style={{ 
                    width: `${Math.min(value, 100)}%`,
                    backgroundColor: color || getDefaultColor(value)
                }}
            />
        </div>
        {showLabel && <span className="progress-label">{value.toFixed(1)}%</span>}
    </div>
);

export default ProgressBar;