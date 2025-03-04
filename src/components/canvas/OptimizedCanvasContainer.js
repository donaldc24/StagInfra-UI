// src/components/canvas/OptimizedCanvasContainer.js
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { ZoomIn, ZoomOut, Move, X, Layers, Trash2 } from 'lucide-react';
import { debounce } from 'lodash';

// Import custom hook
import useConnectionMode from '../../hooks/useConnectionMode';

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
import ContainerComponent from './ContainerComponent';
import ConnectionLine from './ConnectionLine';
import CanvasGrid from './CanvasGrid';

// Import custom hooks
import useCanvasControls from '../../hooks/useCanvasControls';

// Import utilities
import { getComponentMetadata } from '../../services/hierarchicalAwsComponentRegistry';

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
    const [isDragging, setIsDragging] = useState(false);
    const [draggedOverContainer, setDraggedOverContainer] = useState(null);

    // Canvas controls (zoom, pan)
    const {
        scale,
        position,
        handleZoomIn,
        handleZoomOut,
        handleWheel,
        resetView
    } = useCanvasControls();

    // Connection mode hook
    const {
        ghostLine,
        connectionStartComponent,
        startConnection,
        updateGhostLine,
        completeConnection,
        cancelConnection
    } = useConnectionMode(
        stageRef,
        canvasComponents,
        connections,
        dispatch,
        showNotification
    );

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

    // Organize components by container
    const organizedComponents = useMemo(() => {
        // Start with containers (VPCs, Subnets)
        const containers = canvasComponents.filter(comp => {
            const metadata = getComponentMetadata(comp.type);
            return metadata && metadata.isContainer;
        });

        // Map to hold contained components
        const containedComponents = new Map();
        containers.forEach(container => {
            containedComponents.set(container.id, []);
        });

        // Check each component to see if it's contained
        canvasComponents.forEach(component => {
            if (component.containerId) {
                const containerComponents = containedComponents.get(component.containerId);
                if (containerComponents) {
                    containerComponents.push(component);
                }
            }
        });

        // Get standalone components (not in any container)
        const standaloneComponents = canvasComponents.filter(comp =>
            !comp.containerId && !getComponentMetadata(comp.type)?.isContainer
        );

        return {
            containers,
            containedComponents,
            standaloneComponents
        };
    }, [canvasComponents]);

    // Handle component click
    const handleComponentClick = useCallback((e, component) => {
        e.cancelBubble = true;

        // Connection mode logic
        if (isLineMode) {
            if (!connectionStartComponent) {
                // Start a new connection
                startConnection(component);
            } else if (connectionStartComponent.id !== component.id) {
                // Attempt to complete the connection
                const connectionSuccessful = completeConnection(component);

                // Reset line mode if connection was successful or failed
                if (connectionSuccessful) {
                    dispatch(setLineMode(false));
                }
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
    }, [
        isLineMode,
        connectionStartComponent,
        startConnection,
        completeConnection,
        dispatch,
        onComponentSelect
    ]);

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
            if (isLineMode) {
                cancelConnection();
            }
        }
    }, [dispatch, isLineMode, connectionStartComponent, onComponentSelect, cancelConnection]);

    // Handle mouse move for drawing connections
    const handleMouseMove = useCallback((e) => {
        if (isLineMode) {
            updateGhostLine(e);
        }
    }, [isLineMode, updateGhostLine]);

    // Check if a point is within a container's bounds
    const isPointInContainer = useCallback((x, y, container) => {
        return (
            x >= container.x &&
            x <= container.x + (container.width || 200) &&
            y >= container.y &&
            y <= container.y + (container.height || 150)
        );
    }, []);

    // Find the container a point is in (if any)
    const findContainerAt = useCallback((x, y) => {
        // Reverse to check top-most containers first
        const reversedContainers = [...organizedComponents.containers].reverse();

        for (const container of reversedContainers) {
            if (isPointInContainer(x, y, container)) {
                return container;
            }
        }
        return null;
    }, [isPointInContainer, organizedComponents.containers]);

    // Component drag handlers
    const handleDragStart = useCallback((e, componentId) => {
        setIsDragging(true);
        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        console.log(`Component ${componentId} drag started`);
    }, [canvasComponents]);

    const handleDragMove = useCallback((e, componentId) => {
        if (!isDragging) return;

        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        // Skip container check if this is a container itself
        const metadata = getComponentMetadata(component.type);
        if (metadata && metadata.isContainer) return;

        // Get current position
        const stage = e.target.getStage();
        const x = e.target.x();
        const y = e.target.y();

        // Check if we're over a container
        const container = findContainerAt(x, y);

        // Update highlight state
        setDraggedOverContainer(container ? container.id : null);
    }, [isDragging, canvasComponents, findContainerAt]);

// In OptimizedCanvasContainer.js
    const handleDragEnd = useCallback((e, componentId) => {
        setIsDragging(false);
        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        // Get the new position
        const newX = e.target.x();
        const newY = e.target.y();

        // Check if dropped in trash area
        const stage = stageRef.current.getStage();
        const pointerPosition = stage.getPointerPosition();

        // Define trash area bounds (top right corner)
        const inTrashArea = (
            pointerPosition.x > (canvasSize.width - 150) &&
            pointerPosition.y < 150
        );

        // If in trash area, prioritize deletion
        if (inTrashArea) {
            dispatch(removeComponent(componentId));
            dispatch(removeComponentConnections(componentId));
            setSelectedComponentId(null);
            showNotification && showNotification('Component deleted', 'success');
            return; // Exit early to prevent further processing
        }

        // Rest of the existing drag end logic...
        const containerData = {};

        // Skip container check if this is a container itself
        const metadata = getComponentMetadata(component.type);
        if (!metadata?.isContainer) {
            const container = findContainerAt(newX, newY);
            if (container) {
                containerData.containerId = container.id;
                console.log(`Component ${componentId} dropped in container ${container.id}`);

                // Use regular showNotification for container placement
                showNotification(
                    `Placed ${component.type.toUpperCase()} in ${container.type.toUpperCase()}`,
                    'success'
                );
            } else if (component.containerId) {
                // Component was removed from a container
                containerData.containerId = null;
            }
        }

        // Reset any highlighted containers
        setDraggedOverContainer(null);

        // Dispatch position update with container info if needed
        dispatch(updateComponentPosition({
            id: componentId,
            position: { x: newX, y: newY },
            ...containerData
        }));

        // Use regular showNotification for movement
        showNotification(
            `${component.type.toUpperCase()} component moved`,
            'info'
        );
    }, [dispatch, canvasComponents, canvasSize, showNotification, findContainerAt]);

// Create a debounced version of showNotification outside of the component
    const debouncedShowNotification = debounce((message, type) => {
        showNotification(message, type);
    }, 500); // 500ms delay between notifications

    // Handler when a container is dragged
    const handleContainerDragMove = useCallback((e, containerId) => {
        if (!isDragging) return;

        // Update positions of all contained components to move with the container
        const containerComponents = organizedComponents.containedComponents.get(containerId) || [];

        // Get the container's movement delta
        const container = canvasComponents.find(c => c.id === containerId);
        if (!container) return;

        const dx = e.target.x() - container.x;
        const dy = e.target.y() - container.y;

        // We're not updating the actual components here since they'll be
        // updated when the container's drag ends
        console.log(`Container moved by dx=${dx}, dy=${dy}. Will move ${containerComponents.length} contained components`);
    }, [isDragging, canvasComponents, organizedComponents.containedComponents]);

    const handleContainerDragEnd = useCallback((e, containerId) => {
        setIsDragging(false);
        const container = canvasComponents.find(c => c.id === containerId);
        if (!container) return;

        // Get the new position
        const newX = e.target.x();
        const newY = e.target.y();

        // Calculate movement delta
        const dx = newX - container.x;
        const dy = newY - container.y;

        console.log(`Container ${containerId} dragged to:`, { x: newX, y: newY });

        // First update the container position
        dispatch(updateComponentPosition({
            id: containerId,
            position: { x: newX, y: newY }
        }));

        // Then update all contained components to move with the container
        const containerComponents = organizedComponents.containedComponents.get(containerId) || [];
        containerComponents.forEach(component => {
            dispatch(updateComponentPosition({
                id: component.id,
                position: { x: component.x + dx, y: component.y + dy }
            }));
        });

        // Show notification
        showNotification && showNotification(
            `${container.type.toUpperCase()} container moved`,
            'info'
        );

        // Check if dropped in trash area
        const stage = stageRef.current.getStage();
        const pointerPosition = stage.getPointerPosition();

        // Define trash area bounds (top right corner)
        const inTrashArea = (
            pointerPosition.x > (canvasSize.width - 150) &&
            pointerPosition.y < 150
        );

        if (inTrashArea) {
            // Delete the container and all its components
            const containerComponents = organizedComponents.containedComponents.get(containerId) || [];

            // Delete all contained components first
            containerComponents.forEach(component => {
                dispatch(removeComponent(component.id));
                dispatch(removeComponentConnections(component.id));
            });

            // Then delete the container itself
            dispatch(removeComponent(containerId));
            dispatch(removeComponentConnections(containerId));

            setSelectedComponentId(null);
            showNotification && showNotification('Container and its contents deleted', 'success');
        }

        debouncedShowNotification(
            `${container.type.toUpperCase()} container moved`,
            'info'
        );
    }, [canvasComponents, dispatch, organizedComponents.containedComponents, showNotification, canvasSize.width, debouncedShowNotification]);

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

// Render a container with its contained components
    const renderContainer = useCallback((container) => {
        const isSelected = selectedComponentId === container.id;
        const isHighlighted = draggedOverContainer === container.id;

        // Get contained components
        const containedComponents = organizedComponents.containedComponents.get(container.id) || [];

        return (
            <ContainerComponent
                key={container.id}
                component={container}
                isSelected={isSelected}
                isHighlighted={isHighlighted}
                onClick={handleComponentClick}
                onDragMove={(e) => handleContainerDragMove(e, container.id)}
                onDragEnd={(e) => handleContainerDragEnd(e, container.id)}
            >
                {/* Render contained components */}
                {containedComponents.map(component => (
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
            </ContainerComponent>
        );
    }, [
        selectedComponentId,
        draggedOverContainer,
        organizedComponents.containedComponents,
        handleComponentClick,
        handleContainerDragMove,
        handleContainerDragEnd,
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        isLineMode
    ]);

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

                    {/* Render containers first (bottom layer) */}
                    {organizedComponents.containers.map(container =>
                        renderContainer(container)
                    )}

                    {/* Render standalone components (top layer) */}
                    {organizedComponents.standaloneComponents.map(component => (
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
                        onClick={() => {
                            dispatch(setLineMode(false));
                            cancelConnection();
                        }}
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
                <div>Containers: {organizedComponents.containers.length}</div>
                <div>Standalone: {organizedComponents.standaloneComponents.length}</div>
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