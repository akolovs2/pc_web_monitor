import type { ContainerItemProps } from "../types/Metrics";
import { useState, useEffect } from 'react';

const ContainerItem = ({ name, status, image, cpu, memory, onAction }: ContainerItemProps) => {
    const [loading, setLoading] = useState(false);
    const [prevStatus, setPrevStatus] = useState(status);
    const isRunning = status === 'running';
    
    useEffect(() => {
        if (status !== prevStatus) {
            setLoading(false);
            setPrevStatus(status);
        }
    }, [status, prevStatus]);
    
    const handleAction = async (action: 'start' | 'stop' | 'restart') => {
        setLoading(true);
        try {
            const result = await onAction(name, action);
            if (result && !result.success) {
                setLoading(false);
            }
        } catch {
            setLoading(false);
        }
    };
    
    return (
        <div className="service flexbox">
            <div className="item-data">
                <span className="service-name">{name}</span>
                {isRunning && <div className="other-data flexbox">
                    <span className="service-cpu">CPU: {cpu}%</span>
                    <span className="service-memory">RAM: {memory}%</span>                                    
                </div>}
            </div>
            <div className="actions">
                {loading ? (
                    <span className="spinner"></span>
                ) : isRunning ? (
                    <>
                        <button onClick={() => handleAction('stop')}>Stop</button>
                        <button onClick={() => handleAction('restart')}>Restart</button>
                    </>
                ) : (
                    <button onClick={() => handleAction('start')}>Start</button>
                )}
            </div>
        </div>
    );
};

export default ContainerItem;