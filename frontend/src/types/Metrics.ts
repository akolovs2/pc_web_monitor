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
    hostname: string;
    cpu: number;
    ram: number;
    storage?: number;
    storage_used?: number;
    storage_total?: number;
    containers: Container[];
    tasks: Task[];
}

export interface ProgressCardProps {
    title: string;
    value: number;
    subtitle?: string;
    extraInfo?: string;
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

export interface CreateContainerParams {
    image: string;
    name?: string;
    ports?: string[];
    env?: string[];
    volumes?: string[];
    restart_policy?: string;
    command?: string;
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
    extraActions?: ReactNode;
    statusFilter?: ContainerStatusFilter;
    onStatusFilterChange?: (filter: ContainerStatusFilter) => void;
    statusCounts?: { all: number; running: number; stopped: number };
    sortOption?: ContainerSortOption;
    onSortChange?: (option: ContainerSortOption) => void;
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
    created?: string;
}

export type ContainerSortOption =
    | 'status-desc'
    | 'status-asc'
    | 'name-asc'
    | 'name-desc'
    | 'cpu-desc'
    | 'cpu-asc'
    | 'memory-desc'
    | 'memory-asc'
    | 'created-desc'
    | 'created-asc'
    | 'id-asc'
    | 'id-desc';

export type ContainerStatusFilter = 'all' | 'running' | 'stopped';

export type ContainerActionType = 'start' | 'stop' | 'restart' | 'remove' | 'delete';

export interface ContainerPortInfo {
    container_port: string;
    protocol: string;
    host_port: string;
    host_ip?: string;
}

export interface ContainerVolumeInfo {
    host_path: string;
    container_path: string;
    mode: string;
}

export interface ContainerDetails {
    id: string;
    name: string;
    status: string;
    image: string;
    image_id: string;
    created: string;
    started_at: string;
    finished_at: string;
    restart_policy: string;
    ports: ContainerPortInfo[];
    env: string[];
    volumes: ContainerVolumeInfo[];
    command?: string;
    memory_limit: number;
    cpu_shares: number;
    networks: string[];
    ip_address: string;
}

export interface UpdateContainerParams {
    restart_policy?: string;
    mem_limit?: number;
    cpu_shares?: number;
    new_name?: string;
}

export interface RecreateContainerParams {
    image: string;
    new_name?: string;
    ports?: string[];
    env?: string[];
    volumes?: string[];
    restart_policy?: string;
    command?: string;
}

export interface ContainerItemProps {
    id: string;
    name: string;
    status: string;
    image: string;
    cpu: number;
    memory: number;
    onAction: (name: string, action: ContainerActionType) => Promise<{ success: boolean; message?: string }>;
    onManage?: (name: string) => void;
}