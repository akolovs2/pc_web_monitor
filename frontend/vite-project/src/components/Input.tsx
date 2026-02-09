import type { InputHTMLAttributes } from 'react';
import '../styles/ui.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = ({ label, error, id, className = '', ...props }: InputProps) => (
    <div className="form-group">
        {label && <label htmlFor={id}>{label}</label>}
        <input 
            id={id}
            className={`input ${error ? 'input-error' : ''} ${className}`}
            {...props}
        />
        {error && <span className="error-text">{error}</span>}
    </div>
);

export default Input;