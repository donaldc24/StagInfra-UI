// src/hooks/useCanvasControls.js
import { useState, useCallback } from 'react';

const useCanvasControls = (initialScale = 1, minScale = 0.1, maxScale = 5) => {
    const [scale, setScale] = useState(initialScale);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const handleZoomIn = useCallback(() => {
        setScale(prev => Math.min(prev * 1.2, maxScale));
    }, [maxScale]);

    const handleZoomOut = useCallback(() => {
        setScale(prev => Math.max(prev / 1.2, minScale));
    }, [minScale]);

    const handleWheel = useCallback((e) => {
        e.evt.preventDefault();

        const scaleBy = 1.1;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();

        const pointerPosition = stage.getPointerPosition();
        const mousePointTo = {
            x: (pointerPosition.x - stage.x()) / oldScale,
            y: (pointerPosition.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        // Apply scale limits
        const limitedScale = Math.max(minScale, Math.min(maxScale, newScale));

        setScale(limitedScale);

        // Adjust position to zoom toward mouse position
        setPosition({
            x: pointerPosition.x - mousePointTo.x * limitedScale,
            y: pointerPosition.y - mousePointTo.y * limitedScale,
        });
    }, [minScale, maxScale]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;

        const stage = e.target.getStage();
        setPosition({
            x: stage.x(),
            y: stage.y(),
        });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resetView = useCallback(() => {
        setScale(initialScale);
        setPosition({ x: 0, y: 0 });
    }, [initialScale]);

    return {
        scale,
        position,
        isDragging,
        handleZoomIn,
        handleZoomOut,
        handleWheel,
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        resetView,
    };
};

export default useCanvasControls;