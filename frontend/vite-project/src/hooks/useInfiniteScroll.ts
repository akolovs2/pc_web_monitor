import { useState, useEffect, useCallback } from 'react';

const useInfiniteScroll = <T,>(items: T[], initialCount = 10, increment = 10) => {
    const [visibleCount, setVisibleCount] = useState(initialCount);

    useEffect(() => {
        setVisibleCount(initialCount);
    }, [items.length, initialCount]);

    const loadMore = useCallback(() => {
        setVisibleCount(prev => Math.min(prev + increment, items.length));
    }, [increment, items.length]);

    const handleScroll = useCallback((ref: HTMLElement | null) => {
        if (!ref) return;
        const { scrollTop, scrollHeight, clientHeight } = ref;
        if (scrollTop + clientHeight >= scrollHeight - 20) loadMore();
    }, [loadMore]);

    return {
        visibleItems: items.slice(0, visibleCount),
        loadMore,
        handleScroll,
    };
};

export default useInfiniteScroll;