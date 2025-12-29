import { useState, useEffect, useCallback } from 'react';

const useInfiniteScroll = <T,>(
    items: T[],
    initialCount: number = 10,
    increment: number = 10
): [T[], () => void, (ref: HTMLElement | null) => void] => {
    const [visibleCount, setVisibleCount] = useState(initialCount);

    // Reset when items change (e.g., search filter)
    useEffect(() => {
        setVisibleCount(initialCount);
    }, [items.length, initialCount]);

    const visibleItems = items.slice(0, visibleCount);

    const loadMore = useCallback(() => {
        setVisibleCount(prev => Math.min(prev + increment, items.length));
    }, [increment, items.length]);

    const handleScroll = useCallback((ref: HTMLElement | null) => {
        if (!ref) return;
        
        const { scrollTop, scrollHeight, clientHeight } = ref;
        // Load more when scrolled to bottom (with 20px threshold)
        if (scrollTop + clientHeight >= scrollHeight - 20) {
            loadMore();
        }
    }, [loadMore]);

    return [visibleItems, loadMore, handleScroll];
};

export default useInfiniteScroll;