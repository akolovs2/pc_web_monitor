import { useState, useEffect } from 'react';
import { useMetrics } from '../hooks/useMetrics';
import useHasScrollbar from '../hooks/useHasScrollbar';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import ProgressCard from '../features/dashboard/ProgressCard';
import SearchableList from '../features/dashboard/SearchableList';
import ContainerItem from '../features/dashboard/ContainerItem';
//import TaskItem from '../features/dashboard/TaskItem';
import { INITIAL_LIST_COUNT, LIST_INCREMENT } from '../config';
import { auth } from '../services/auth';
import '../styles/Metrics.css';
import { Button } from '../components';

const Metrics = () => {
    const { data, killTask, containerAction, isConnected } = useMetrics();
    const [containersSearch, setContainersSearch] = useState('');
    const [tasksSearch, setTasksSearch] = useState('');

    const [username, setUsername] = useState('');
    
    const [containersRef, containersHasScrollbar] = useHasScrollbar<HTMLDivElement>([data.containers, containersSearch]);
    const [tasksRef, tasksHasScrollbar] = useHasScrollbar<HTMLDivElement>([data.tasks, tasksSearch]);

    const filteredContainers = (data.containers || []).filter((container) =>
        container.name.toLowerCase().includes(containersSearch.toLowerCase())
    );

    const filteredTasks = data.tasks.filter((task) =>
        task.name.toLowerCase().includes(tasksSearch.toLowerCase())
    );

    const { visibleItems: visibleContainers, handleScroll: handleContainersScroll } = useInfiniteScroll(filteredContainers, INITIAL_LIST_COUNT, LIST_INCREMENT);
    //const { visibleItems: visibleTasks, handleScroll: handleTasksScroll } = useInfiniteScroll(filteredTasks, INITIAL_LIST_COUNT, LIST_INCREMENT);
    
    useEffect(() => {
        auth.getUsername().then((name) => {
            if (name) setUsername(name);
        });
    }, []);
    
    return (
        <div className="metrics">
            <div className='user-info'>
                 Welcome, {username} <Button onClick={() => auth.logout()}>Logout</Button>
            </div>

            <h1>{data.hostname || 'Loading...'}</h1>

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

                {/*<SearchableList
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
                </SearchableList>*/}
            </div>
        </div>
    );
};

export default Metrics;