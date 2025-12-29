import { useEffect, useRef, useState } from 'react';

const VideoStream = () => {
    const [screen, setScreen] = useState<string>('');
    const wsRef = useRef<WebSocket | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const ws = new WebSocket("ws://192.168.31.113:8000/remote");
        wsRef.current = ws;
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'screen') {
                setScreen(`data:image/jpeg;base64,${data.image}`);
            }
        };
        
        return () => ws.close();
    }, []);

    const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
        const img = imgRef.current;
        if (!img || !wsRef.current) return;
        
        const rect = img.getBoundingClientRect();
        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;
        
        wsRef.current.send(JSON.stringify({
            type: 'click',
            x: Math.round((e.clientX - rect.left) * scaleX),
            y: Math.round((e.clientY - rect.top) * scaleY)
        }));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!wsRef.current) return;
        wsRef.current.send(JSON.stringify({
            type: 'key',
            key: e.key
        }));
    };

    return (
        <div tabIndex={0} onKeyDown={handleKeyDown} style={{ maxWidth: '1280px', margin: '2em auto' }}>
            <img 
                ref={imgRef}
                src={screen} 
                alt="Remote screen"
                onClick={handleClick}
                style={{ cursor: 'crosshair', maxWidth: '100%' }}
            />
        </div>
    );
};

export default VideoStream;