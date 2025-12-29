// pages/Metrics.tsx
import '../assets/styles/Metrics.css';
import { useState } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import useHasScrollbar from '../hooks/useHasScrollbar';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import ProgressCard from '../components/ProgressCard';
import SearchableList from '../components/SearchableList';
import ServiceItem from '../components/ServiceItem';
import TaskItem from '../components/TaskItem';
import { INITIAL_LIST_COUNT, LIST_INCREMENT } from '../config';

const Metrics = () => {
    const { data, killTask, isConnected } = useMetrics();
    const [servicesSearch, setServicesSearch] = useState('');
    const [tasksSearch, setTasksSearch] = useState('');
    
    const [servicesRef, servicesHasScrollbar] = useHasScrollbar<HTMLDivElement>([data.services, servicesSearch]);
    const [tasksRef, tasksHasScrollbar] = useHasScrollbar<HTMLDivElement>([data.tasks, tasksSearch]);

    const filteredServices = data.services.filter((service) =>
        service.name.toLowerCase().includes(servicesSearch.toLowerCase())
    );

    const filteredTasks = data.tasks.filter((task) =>
        task.name.toLowerCase().includes(tasksSearch.toLowerCase())
    );

    const [visibleServices, , handleServicesScroll] = useInfiniteScroll(filteredServices, INITIAL_LIST_COUNT, LIST_INCREMENT);
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
                    title="Services"
                    visibleCount={visibleServices.length}
                    totalCount={filteredServices.length}
                    searchValue={servicesSearch}
                    onSearchChange={setServicesSearch}
                    placeholder="Search services..."
                    listRef={servicesRef}
                    hasScrollbar={servicesHasScrollbar}
                    onScroll={handleServicesScroll}
                    isEmpty={visibleServices.length === 0}
                >
                    {visibleServices.map((service, index) => (
                        <ServiceItem key={index} {...service} />
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