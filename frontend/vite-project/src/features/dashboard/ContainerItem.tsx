import type { ContainerItemProps } from "../../types/Metrics";
import { useState, useEffect, useRef } from 'react';
import { Button, Spinner } from "../../components";

const ContainerItem = ({ name, status, image, cpu, memory, onAction }: ContainerItemProps) => {
    const [loading, setLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const prevStatusRef = useRef(status);
    
    useEffect(() => {
        // For start/stop: status changes
        if (status !== prevStatusRef.current) {
            setLoading(false);
            setPendingAction(null);
        }
        prevStatusRef.current = status;
    }, [status]);
    
    useEffect(() => {
        // For restart: use timeout since status doesn't change
        if (pendingAction === 'restart' && loading) {
            const timeout = setTimeout(() => {
                setLoading(false);
                setPendingAction(null);
            }, 5000); // 5 sec timeout for restart
            return () => clearTimeout(timeout);
        }
    }, [pendingAction, loading]);
    
    const handleAction = async (action: 'start' | 'stop' | 'restart') => {
        setLoading(true);
        setPendingAction(action);
        try {
            const result = await onAction(name, action);
            if (!result || !result.success) {
                setLoading(false);
                setPendingAction(null);
            }
        } catch {
            setLoading(false);
            setPendingAction(null);
        }
    };
    
    const isRunning = status === 'running';
    
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
                    <Spinner size="md" />
                ) : isRunning ? (
                    <>
                        <Button onClick={() => handleAction('stop')}>Stop</Button>
                        <Button onClick={() => handleAction('restart')}>Restart</Button>
                    </>
                ) : (
                    <Button onClick={() => handleAction('start')}>Start</Button>
                )}
            </div>
        </div>
    );
};

export default ContainerItem;