import type { ReactNode } from "react";

export interface Service {
    name: string;
    status: string;
}

export interface Task {
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    status: string;
}

export interface MetricsData {
    cpu: number;
    ram: number;
    containers: Container[];
    tasks: Task[];
}

export interface ProgressCardProps {
    title: string;
    value: number;
}

export interface ServiceItemProps {
    name: string;
    status: string;
}

export interface TaskItemProps {
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    status: string;
    onKill: (pid: number, name: string) => void;
}

export interface SearchableListProps {
    title: string;
    visibleCount: number;
    totalCount: number;
    searchValue: string;
    onSearchChange: (value: string) => void;
    placeholder: string;
    listRef: React.RefObject<HTMLDivElement | null>;
    hasScrollbar: boolean;
    onScroll: (el: HTMLElement) => void;
    children: ReactNode;
    isEmpty: boolean;
}

export interface Container {
    id: string;
    name: string;
    status: string;
    image: string;
    cpu: number;
    memory: number;
    memory_usage: number;
    memory_limit: number;
}

export interface ContainerItemProps {
    id: string;
    name: string;
    status: string;
    image: string;
    cpu: number;
    memory: number;
    onAction: (name: string, action: 'start' | 'stop' | 'restart') => Promise<{ success: boolean; message?: string }>;
}