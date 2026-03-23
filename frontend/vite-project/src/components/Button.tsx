import type { ButtonHTMLAttributes } from 'react';
import '../styles/ui.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'danger' | 'secondary';
    loading?: boolean;
}

const Button = ({ 
    children, 
    variant = 'primary', 
    loading, 
    disabled,
    className = '',
    ...props 
}: ButtonProps) => (
    <button 
        className={`btn btn-${variant} ${className}`}
        disabled={disabled || loading}
        {...props}
    >
        {loading ? <span className="spinner spinner-md" /> : children}
    </button>
);

export default Button;