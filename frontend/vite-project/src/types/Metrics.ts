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
    services: Service[];
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