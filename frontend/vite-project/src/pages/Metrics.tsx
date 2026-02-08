// pages/Metrics.tsx
import '../assets/styles/Metrics.css';
import { useState } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import useHasScrollbar from '../hooks/useHasScrollbar';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import ProgressCard from '../components/ProgressCard';
import SearchableList from '../components/SearchableList';
import ContainerItem from '../components/ContainerItem';
import TaskItem from '../components/TaskItem';
import { INITIAL_LIST_COUNT, LIST_INCREMENT } from '../config';

const Metrics = () => {
    const { data, killTask, containerAction, isConnected } = useMetrics();
    const [containersSearch, setContainersSearch] = useState('');
    const [tasksSearch, setTasksSearch] = useState('');
    
    const [containersRef, containersHasScrollbar] = useHasScrollbar<HTMLDivElement>([data.containers, containersSearch]);
    const [tasksRef, tasksHasScrollbar] = useHasScrollbar<HTMLDivElement>([data.tasks, tasksSearch]);

    const filteredContainers = (data.containers || []).filter((container) =>
        container.name.toLowerCase().includes(containersSearch.toLowerCase())
    );

    const filteredTasks = data.tasks.filter((task) =>
        task.name.toLowerCase().includes(tasksSearch.toLowerCase())
    );

    const [visibleContainers, , handleContainersScroll] = useInfiniteScroll(filteredContainers, INITIAL_LIST_COUNT, LIST_INCREMENT);
    const [visibleTasks, , handleTasksScroll] = useInfiniteScroll(filteredTasks, INITIAL_LIST_COUNT, LIST_INCREMENT);

    return (
        <div className="metrics">
            <h1>PC metrics</h1>
            
            <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '●' : '○'}
            </span>
            
            <div className="flexbox cards-container">
                <ProgressCard title="CPU" value={data.cpu} />
                <ProgressCard title="RAM" value={data.ram} />
            </div>

            <div className="flexbox lists-container">
                <SearchableList
                    title="Containers"
                    visibleCount={visibleContainers.length}
                    totalCount={filteredContainers.length}
                    searchValue={containersSearch}
                    onSearchChange={setContainersSearch}
                    placeholder="Search containers..."
                    listRef={containersRef}
                    hasScrollbar={containersHasScrollbar}
                    onScroll={handleContainersScroll}
                    isEmpty={visibleContainers.length === 0}
                >
                    {visibleContainers.map((container) => (
                        <ContainerItem 
                            key={container.id} 
                            {...container} 
                            onAction={containerAction}
                        />
                    ))}
                </SearchableList>

                <SearchableList
                    title="Tasks"
                    visibleCount={visibleTasks.length}
                    totalCount={filteredTasks.length}
                    searchValue={tasksSearch}
                    onSearchChange={setTasksSearch}
                    placeholder="Search tasks..."
                    listRef={tasksRef}
                    hasScrollbar={tasksHasScrollbar}
                    onScroll={handleTasksScroll}
                    isEmpty={visibleTasks.length === 0}
                >
                    {visibleTasks.map((task) => (
                        <TaskItem key={task.pid} {...task} onKill={killTask} />
                    ))}
                </SearchableList>
            </div>
        </div>
    );
};

export default Metrics;