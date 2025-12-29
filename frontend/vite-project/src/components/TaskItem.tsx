import type { TaskItemProps } from "../types/Metrics";

const TaskItem = ({ pid, name, cpu, memory, status, onKill }: TaskItemProps) => (
    <div className="service flexbox">
        <div className="task-data">
            <span className="service-name">{name}</span>
            <div className="other-data flexbox">
                <span className="service-pid">PID: {pid}</span>
                <span className="service-cpu">CPU: {cpu}%</span>
                <span className="service-memory">RAM: {memory}%</span>                                    
            </div>
        </div>
        <span className={`service-status ${status.toLowerCase()}`}>{status}</span>
        <button className="kill-btn" onClick={() => onKill(pid, name)}>✕</button>
    </div>
);

export default TaskItem;