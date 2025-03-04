// src/components/canvas/OptimizedCanvasContainer.js
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { ZoomIn, ZoomOut, Move, X, Layers, Trash2 } from 'lucide-react';

// Import actions
import {
    updateComponentPosition,
    selectComponents,
    removeComponent
} from '../../store/slices/componentsSlice';

import {
    setLineMode,
    setLineStart
} from '../../store/slices/uiStateSlice';

import {
    removeConnection,
    removeComponentConnections
} from '../../store/slices/connectionsSlice';

// Import components
import AwsComponent from './AwsComponent';
import ConnectionLine from './ConnectionLine';
import CanvasGrid from './CanvasGrid';

// Import custom hooks
import useCanvasControls from '../../hooks/useCanvasControls';

const OptimizedCanvasContainer = ({ onComponentSelect, showNotification }) => {
    const dispatch = useDispatch();
    const stageRef = useRef(null);

    // Redux state
    const canvasComponents = useSelector(selectComponents);
    const connections = useSelector(state => state.connections);
    const { isLineMode, lineStart } = useSelector(state => state.uiState);

    // Local state
    const [selectedComponentId, setSelectedComponentId] = useState(null);
    const [selectedConnectionId, setSelectedConnectionId] = useState(null);
    const [ghostLine, setGhostLine] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Canvas controls (zoom, pan)
    const {
        scale,
        position,
        handleZoomIn,
        handleZoomOut,
        handleWheel,
        resetView
    } = useCanvasControls();

    // Debug information
    useEffect(() => {
        console.log('Canvas components:', canvasComponents);
    }, [canvasComponents]);

    // Calculate canvas size
    const canvasSize = useMemo(() => ({
        width: window.innerWidth - 300,  // Adjust based on sidebar width
        height: window.innerHeight - 60  // Adjust based on header height
    }), []);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (stageRef.current) {
                const stage = stageRef.current.getStage();
                stage.width(window.innerWidth - 300);
                stage.height(window.innerHeight - 60);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle component click
    const handleComponentClick = useCallback((e, component) => {
        e.cancelBubble = true;

        console.log('Component clicked:', component);

        if (isLineMode) {
            if (!lineStart) {
                // Start a connection
                dispatch(setLineStart(component));
                // Create ghost line
                const sourceX = component.x + (component.width || 40) / 2;
                const sourceY = component.y + (component.height || 40) / 2;
                setGhostLine({
                    points: [sourceX, sourceY, sourceX, sourceY]
                });

                showNotification && showNotification(
                    `Select a target to connect from ${component.name || component.type}`,
                    'info'
                );
            } else if (lineStart.id !== component.id) {
                // Complete the connection
                // TODO: Add your connection validation and creation logic here

                // Reset the line drawing state
                dispatch(setLineStart(null));
                setGhostLine(null);
            }
        } else {
            // Normal selection
            setSelectedComponentId(component.id);
            if (onComponentSelect) {
                onComponentSelect(component);
            }

            // Deselect connection
            setSelectedConnectionId(null);
        }
    }, [dispatch, isLineMode, lineStart, onComponentSelect, showNotification]);

    // Handle stage click (deselect everything)
    const handleStageClick = useCallback((e) => {
        // Only handle clicks directly on the stage
        if (e.target === e.currentTarget) {
            console.log('Stage background clicked');
            setSelectedComponentId(null);
            setSelectedConnectionId(null);

            if (onComponentSelect) {
                onComponentSelect(null);
            }

            // Cancel any ongoing line drawing
            if (isLineMode && lineStart) {
                dispatch(setLineStart(null));
                setGhostLine(null);
            }
        }
    }, [dispatch, isLineMode, lineStart, onComponentSelect]);

    // Handle mouse move for drawing connections
    const handleMouseMove = useCallback((e) => {
        if (isLineMode && ghostLine && lineStart) {
            const stage = e.target.getStage();
            const point = stage.getPointerPosition();
            const sourceX = ghostLine.points[0];
            const sourceY = ghostLine.points[1];

            setGhostLine({
                points: [
                    sourceX,
                    sourceY,
                    (point.x - stage.x()) / stage.scaleX(),
                    (point.y - stage.y()) / stage.scaleY()
                ]
            });
        }
    }, [isLineMode, ghostLine, lineStart]);

    // Handle component dragging
    const handleDragStart = useCallback((e, componentId) => {
        setIsDragging(true);
        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        console.log(`Component ${componentId} drag started`);
    }, [canvasComponents]);

    const handleDragMove = useCallback((e, componentId) => {
        if (!isDragging) return;

        // Optional: Update component position in real-time
        // This could be useful for showing live updates to connections
    }, [isDragging]);

    const handleDragEnd = useCallback((e, componentId) => {
        setIsDragging(false);
        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        // Get the new position
        const newX = e.target.x();
        const newY = e.target.y();

        console.log(`Component ${componentId} dragged to:`, { x: newX, y: newY });

        // Dispatch position update
        dispatch(updateComponentPosition({
            id: componentId,
            position: { x: newX, y: newY }
        }));

        // Show notification
        showNotification && showNotification(
            `${component.type.toUpperCase()} component moved`,
            'info'
        );

        // Check if dropped in trash area
        const stage = stageRef.current.getStage();
        const stageRect = stage.container().getBoundingClientRect();
        const pointerPosition = stage.getPointerPosition();

        // Define trash area bounds (top right corner)
        const inTrashArea = (
            pointerPosition.x > (canvasSize.width - 150) &&
            pointerPosition.y < 150
        );

        if (inTrashArea) {
            dispatch(removeComponent(componentId));
            dispatch(removeComponentConnections(componentId));
            setSelectedComponentId(null);
            showNotification && showNotification('Component deleted', 'success');
        }
    }, [dispatch, canvasComponents, canvasSize, showNotification]);

    // Handle component deletion
    const handleDeleteComponent = useCallback((componentId) => {
        dispatch(removeComponent(componentId));
        dispatch(removeComponentConnections(componentId));
        setSelectedComponentId(null);

        showNotification && showNotification(
            'Component deleted',
            'success'
        );
    }, [dispatch, showNotification]);

    // Render connections between components
    const renderConnections = useMemo(() => {
        return connections.map(conn => {
            const source = canvasComponents.find(c => c.id === conn.from);
            const target = canvasComponents.find(c => c.id === conn.to);

            if (!source || !target) return null;

            return (
                <ConnectionLine
                    key={conn.id}
                    connection={conn}
                    sourceComponent={source}
                    targetComponent={target}
                    isSelected={selectedConnectionId === conn.id}
                    onClick={() => setSelectedConnectionId(conn.id)}
                    onDelete={() => {
                        dispatch(removeConnection(conn.id));
                        setSelectedConnectionId(null);
                        showNotification && showNotification('Connection deleted', 'success');
                    }}
                />
            );
        });
    }, [canvasComponents, connections, selectedConnectionId, dispatch, showNotification]);

    return (
        <div className="canvas-container relative h-full w-full">
            {/* Main canvas */}
            <Stage
                ref={stageRef}
                width={canvasSize.width}
                height={canvasSize.height}
                scaleX={scale}
                scaleY={scale}
                x={position.x}
                y={position.y}
                onClick={handleStageClick}
                onMouseMove={handleMouseMove}
                onWheel={handleWheel}
            >
                <Layer>
                    {/* Render grid */}
                    <CanvasGrid
                        width={canvasSize.width}
                        height={canvasSize.height}
                        scale={scale}
                    />

                    {/* Render components */}
                    {canvasComponents.map(component => (
                        <AwsComponent
                            key={component.id}
                            component={component}
                            isSelected={selectedComponentId === component.id}
                            isConnectable={isLineMode}
                            onClick={handleComponentClick}
                            onDragStart={(e) => handleDragStart(e, component.id)}
                            onDragMove={(e) => handleDragMove(e, component.id)}
                            onDragEnd={(e) => handleDragEnd(e, component.id)}
                        />
                    ))}

                    {/* Render connections */}
                    {renderConnections}

                    {/* Render ghost line for connection drawing */}
                    {ghostLine && (
                        <ConnectionLine
                            isGhost={true}
                            points={ghostLine.points}
                        />
                    )}
                </Layer>
            </Stage>

            {/* Zoom controls */}
            <div className="zoom-controls">
                <button className="zoom-button" onClick={handleZoomIn}>
                    <ZoomIn size={16} />
                </button>
                <div className="zoom-value">{Math.round(scale * 100)}%</div>
                <button className="zoom-button" onClick={handleZoomOut}>
                    <ZoomOut size={16} />
                </button>
                <button className="zoom-button" onClick={resetView}>
                    <Move size={16} />
                </button>
            </div>

            {/* Connection mode indicator */}
            {isLineMode && (
                <div className="connection-mode-indicator">
                    <span className="connection-mode-indicator-icon">
                      <Layers size={16} />
                    </span>
                    <span>Connection Mode Active</span>
                    <button
                        className="connection-mode-close"
                        onClick={() => dispatch(setLineMode(false))}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Trash area */}
            <div className="trash-area">
                <Trash2 className="trash-icon" size={24} />
                <span className="trash-text">Drop to Delete</span>
            </div>

            {/* Debug overlay - add ?debug to URL to show */}
            <div
                style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: 10,
                    fontSize: 12,
                    display: window.location.search.includes('debug') ? 'block' : 'none',
                    zIndex: 1000
                }}
            >
                <div>Components: {canvasComponents.length}</div>
                <div>Scale: {scale.toFixed(2)}</div>
                <div>Selected: {selectedComponentId || 'none'}</div>
                <div>Position: ({position.x.toFixed(0)}, {position.y.toFixed(0)})</div>
                {selectedComponentId && (
                    <div>
                        Selected Component: {
                        canvasComponents.find(c => c.id === selectedComponentId)?.type
                    }
                    </div>
                )}
            </div>
        </div>
    );
};

export default OptimizedCanvasContainer;