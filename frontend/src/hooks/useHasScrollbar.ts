import { useState, useEffect, useRef, type RefObject } from 'react';

const useHasScrollbar = <T extends HTMLElement>(deps: unknown[]): [RefObject<T | null>, boolean] => {
    const ref = useRef<T | null>(null);
    const [hasScrollbar, setHasScrollbar] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (el) {
            setHasScrollbar(el.scrollHeight > el.clientHeight);
        }
    }, deps);

    return [ref, hasScrollbar];
};

export default useHasScrollbar;