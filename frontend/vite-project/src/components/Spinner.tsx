import '../styles/ui.css';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

const Spinner = ({ size = 'md' }: SpinnerProps) => (
    <span className={`spinner spinner-${size}`} />
);

export default Spinner;