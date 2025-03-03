import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { ZoomIn, ZoomOut, Move, X, Plus, Layers, Trash2 } from 'lucide-react';

// Import actions
import {
    setDraggingComponent,
    addComponent,
    updateComponentPosition,
    selectComponents,
    selectDraggingComponent,
    removeComponent
} from '../../store/slices/componentsSlice';

import {
    setLineMode,
    setLineStart
} from '../../store/slices/uiStateSlice';

import {
    addConnection,
    removeConnection,
    removeComponentConnections
} from '../../store/slices/connectionsSlice';

// Import components
import AwsComponent from './AwsComponent';
import ConnectionLine from './ConnectionLine';
import ContainerComponent from './ContainerComponent';
import CanvasGrid from './CanvasGrid';

// Import utilities
import { getComponentMetadata, getDefaultProperties } from '../../services/hierarchicalAwsComponentRegistry';
import { validateConnection } from '../../services/hierarchicalConnectionValidator';

// Import custom hooks
import useConnectionMode from '../../hooks/useConnectionMode';
import useCanvasControls from '../../hooks/useCanvasControls';
import useNotification from '../../hooks/useNotification';

/**
 * Canvas Container component - the main drawing area for the application
 * This implementation improves performance and fixes existing issues
 */
const OptimizedCanvasContainer = ({ onComponentSelect, showNotification: propShowNotification }) => {
    const dispatch = useDispatch();
    const stageRef = useRef(null);

    // Redux state
    const canvasComponents = useSelector(selectComponents);
    const connections = useSelector(state => state.connections);
    const draggingComponent = useSelector(selectDraggingComponent);
    const { isLineMode, lineStart } = useSelector(state => state.uiState);

    // Local state
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [selectedConnection, setSelectedConnection] = useState(null);

    // Custom hooks
    const { notifications, showNotification } = useNotification();
    const {
        scale,
        position,
        handleZoomIn,
        handleZoomOut,
        handleWheel,
        resetView
    } = useCanvasControls();

    // Get the notification function, either from props or local hook
    const notify = propShowNotification || showNotification;

    const {
        ghostLine,
        handleConnectionStart,
        handleConnectionMove,
        handleConnectionComplete,
        handleConnectionCancel
    } = useConnectionMode(stageRef, canvasComponents, connections, dispatch, notify);

    // Memoized canvas size
    const canvasSize = useMemo(() => ({
        width: window.innerWidth - 300, // Adjust based on sidebar width
        height: window.innerHeight - 60 // Adjust based on header height
    }), []);

    // Add debugging information
    useEffect(() => {
        console.log('Rendering OptimizedCanvasContainer with:');
        console.log('- Canvas components:', canvasComponents.length);
        console.log('- Connections:', connections.length);
        console.log('- isLineMode:', isLineMode);
        console.log('- lineStart:', lineStart);
        console.log('- draggingComponent:', draggingComponent);

        // Add debugging styles to help visualize the overlay
        const style = document.createElement('style');
        style.innerHTML = `
            .component-drop-overlay {
                pointer-events: all;
            }
            
            .component-drop-overlay.debug {
                background-color: rgba(255, 0, 0, 0.1);
                border: 1px dashed red;
            }
        `;
        document.head.appendChild(style);

        // Add key event listener for toggling debug mode
        const handleKeyDown = (e) => {
            // Press 'D' to toggle debug mode
            if (e.key.toLowerCase() === 'd' && e.ctrlKey) {
                const overlay = document.querySelector('.component-drop-overlay');
                if (overlay) {
                    overlay.classList.toggle('debug');
                    console.log('Debug mode toggled for drop overlay');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.head.removeChild(style);
        };
    }, [canvasComponents.length, connections.length, isLineMode, lineStart, draggingComponent]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            // Update canvas size if needed
            console.log('Window resized');
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Key event handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            console.log('Key pressed:', e.key);

            // Delete selected component
            if (e.key === 'Delete' && selectedComponent) {
                dispatch(removeComponent(selectedComponent.id));
                dispatch(removeComponentConnections(selectedComponent.id));
                setSelectedComponent(null);
                notify('Component deleted', 'info');
            }

            // Delete selected connection
            if (e.key === 'Delete' && selectedConnection) {
                dispatch(removeConnection(selectedConnection));
                setSelectedConnection(null);
                notify('Connection deleted', 'info');
            }

            // Escape to cancel connection mode
            if (e.key === 'Escape' && isLineMode) {
                dispatch(setLineMode(false));
                dispatch(setLineStart(null));
                handleConnectionCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedComponent, selectedConnection, isLineMode, dispatch, notify, handleConnectionCancel]);

    /**
     * Handle component selection
     * @param {Object} component - The component to select
     * @param {Event} e - The event object
     */
    const handleComponentClick = useCallback((e, component) => {
        e.cancelBubble = true; // Stop propagation in Konva
        if (e.evt) {
            e.evt.preventDefault();
        }

        console.log('Component clicked:', component);

        if (isLineMode) {
            if (!lineStart) {
                // Start connection from this component
                handleConnectionStart(component);
            } else if (lineStart.id !== component.id) {
                // Complete connection to this component
                handleConnectionComplete(component);
            }
        } else {
            // Normal selection - notify parent component
            setSelectedComponent(prev => prev?.id === component.id ? null : component);

            // Also dispatch an event for parent components to listen to
            if (onComponentSelect) {
                onComponentSelect(component);
            }

            // Emit a custom event as a backup communication channel
            const event = new CustomEvent('component-selected', {
                detail: { component }
            });
            window.dispatchEvent(event);

            setSelectedConnection(null);
        }
    }, [isLineMode, lineStart, handleConnectionStart, handleConnectionComplete, setSelectedComponent, setSelectedConnection, onComponentSelect]);

    /**
     * Handle stage background click (deselect everything)
     */
    const handleStageClick = useCallback((e) => {
        // Only handle clicks directly on the stage, not on components
        if (e.target === e.currentTarget) {
            console.log('Stage background clicked');
            setSelectedComponent(null);
            setSelectedConnection(null);

            if (isLineMode && lineStart) {
                handleConnectionCancel();
            }
        }
    }, [isLineMode, lineStart, handleConnectionCancel]);

    /**
     * Handle component dragging
     * @param {Event} e - The drag event
     * @param {string} componentId - ID of the component being dragged
     */
    const handleDragMove = useCallback((e, componentId) => {
        if (!componentId) {
            console.warn('No component ID provided to drag handler');
            return;
        }

        try {
            // Get the component's new position from the event
            const newPosition = {
                x: e.target.x(),
                y: e.target.y()
            };

            // Update component position in Redux
            dispatch(updateComponentPosition({
                id: componentId,
                position: newPosition
            }));

            console.log(`Component ${componentId} moved to (${newPosition.x}, ${newPosition.y})`);

            // If it's a container, need to update contained components' positions
            const component = canvasComponents.find(c => c.id === componentId);
            if (component && (component.type === 'vpc' || component.type === 'subnet')) {
                // Implementation for updating contained components would go here
                // This would be needed for hierarchy, but is a complex feature
            }
        } catch (error) {
            console.error('Error in handleDragMove:', error);
        }
    }, [dispatch, canvasComponents]);

    /**
     * Check if a position is inside a component's boundaries
     * @param {Object} position - The position {x, y} to check
     * @param {Object} component - The component to check against
     * @returns {boolean} - Whether the position is inside the component
     */
    const isPositionInComponent = useCallback((position, component) => {
        const result = (
            position.x >= component.x &&
            position.x <= component.x + (component.width || 40) &&
            position.y >= component.y &&
            position.y <= component.y + (component.height || 40)
        );

        console.log(`Position (${position.x}, ${position.y}) is${result ? '' : ' not'} inside component ${component.id} at (${component.x}, ${component.y}) with size (${component.width || 40}, ${component.height || 40})`);

        return result;
    }, []);

    /**
     * Try to place a component in a container (VPC or subnet)
     * @param {Object} component - The component to place
     * @param {Object} position - The position {x, y} to check
     */
    const tryPlaceInContainer = useCallback((component, position) => {
        console.log(`Trying to place component ${component.id} at position (${position.x}, ${position.y})`);

        // Don't try to place container components inside other containers
        if (component.type === 'vpc') return;

        // For subnet, only check if it's in a VPC
        if (component.type === 'subnet') {
            const vpcs = canvasComponents.filter(c => c.type === 'vpc');
            console.log(`Found ${vpcs.length} VPCs to check for placement`);

            for (const vpc of vpcs) {
                if (isPositionInComponent(position, vpc)) {
                    console.log(`Component position is inside VPC ${vpc.id}`);
                    const validation = validateConnection(component, vpc, canvasComponents, connections);

                    if (validation.valid) {
                        // Check if subnet is already in another VPC
                        const existingConnection = connections.find(conn =>
                            (conn.from === component.id && canvasComponents.find(c => c.id === conn.to)?.type === 'vpc') ||
                            (conn.to === component.id && canvasComponents.find(c => c.id === conn.from)?.type === 'vpc')
                        );

                        if (existingConnection) {
                            console.log(`Removing existing connection ${existingConnection.id}`);
                            // Remove existing connection
                            dispatch(removeConnection(existingConnection.id));
                        }

                        // Add new connection
                        const connectionId = `${component.id}-${vpc.id}`;
                        console.log(`Adding new connection ${connectionId}`);
                        dispatch(addConnection({
                            id: connectionId,
                            from: component.id,
                            to: vpc.id
                        }));

                        notify(`Placed subnet in ${vpc.name || 'VPC'}`, 'success');
                    } else {
                        notify(validation.message, 'error');
                    }
                    return;
                }
            }
        } else {
            // For non-subnet components, check if they're in a subnet
            const subnets = canvasComponents.filter(c => c.type === 'subnet');
            console.log(`Found ${subnets.length} subnets to check for placement`);

            for (const subnet of subnets) {
                if (isPositionInComponent(position, subnet)) {
                    console.log(`Component position is inside subnet ${subnet.id}`);
                    const validation = validateConnection(component, subnet, canvasComponents, connections);

                    if (validation.valid) {
                        // Check if resource is already in another subnet
                        const existingConnection = connections.find(conn =>
                            (conn.from === component.id && canvasComponents.find(c => c.id === conn.to)?.type === 'subnet') ||
                            (conn.to === component.id && canvasComponents.find(c => c.id === conn.from)?.type === 'subnet')
                        );

                        if (existingConnection) {
                            console.log(`Removing existing connection ${existingConnection.id}`);
                            // Remove existing connection
                            dispatch(removeConnection(existingConnection.id));
                        }

                        // Add new connection
                        const connectionId = `${component.id}-${subnet.id}`;
                        console.log(`Adding new connection ${connectionId}`);
                        dispatch(addConnection({
                            id: connectionId,
                            from: component.id,
                            to: subnet.id
                        }));

                        notify(`Placed resource in ${subnet.name || 'subnet'}`, 'success');
                    } else {
                        notify(validation.message, 'error');
                    }
                    return;
                }
            }
        }
    }, [dispatch, canvasComponents, connections, notify, isPositionInComponent]);

    /**
     * Handle component drag end
     * @param {Event} e - The drag end event
     * @param {string} componentId - ID of the component that was dragged
     */
    const handleDragEnd = useCallback((e, componentId) => {
        if (!componentId) {
            console.warn('No component ID provided to drag end handler');
            return;
        }

        try {
            if (!stageRef.current) {
                console.warn('Stage reference not available');
                return;
            }

            const stage = stageRef.current.getStage();
            const pointerPosition = stage.getPointerPosition();
            const component = canvasComponents.find(c => c.id === componentId);

            if (!component) {
                console.warn(`Component with ID ${componentId} not found`);
                return;
            }

            console.log(`Component ${componentId} drag ended at position (${pointerPosition.x}, ${pointerPosition.y})`);

            // Check if component is dropped in trash area
            // Adjust these values according to your UI layout
            const inTrashArea =
                pointerPosition.x > (canvasSize.width - 200) &&
                pointerPosition.y < 150;

            if (inTrashArea) {
                console.log(`Component ${componentId} dropped in trash area`);
                // Delete the component
                dispatch(removeComponent(componentId));
                dispatch(removeComponentConnections(componentId));
                setSelectedComponent(null);
                notify(`Deleted ${component.type} component`, 'success');
            } else {
                // Check if dropping into a container
                tryPlaceInContainer(component, pointerPosition);
            }
        } catch (error) {
            console.error('Error in handleDragEnd:', error);
        }
    }, [dispatch, canvasComponents, canvasSize, setSelectedComponent, notify, stageRef, tryPlaceInContainer]);

    /**
     * Handle dropping a new component onto the canvas
     * @param {string} componentType - The type of component to add
     * @param {Object} position - Position {x, y} where to add the component
     */
    const handleComponentDrop = useCallback((componentType, position) => {
        console.log(`Handling component drop: type=${componentType}, position=(${position.x}, ${position.y})`);

        // Only handle valid component types
        if (!componentType || !getComponentMetadata(componentType)) {
            console.warn('Invalid component type:', componentType);
            return;
        }

        // Get default properties
        const defaultProps = getDefaultProperties(componentType);
        const metadata = getComponentMetadata(componentType);

        // Set dimensions based on component type
        let width = 40;
        let height = 40;

        if (componentType === 'vpc') {
            width = 300;
            height = 250;
        } else if (componentType === 'subnet') {
            width = 200;
            height = 150;
        }

        // Create new component
        const newComponent = {
            id: `${componentType}-${Date.now()}`,
            x: position.x,
            y: position.y,
            width,
            height,
            type: componentType,
            ...defaultProps
        };

        console.log('Creating new component:', newComponent);

        // Add to Redux store
        dispatch(addComponent(newComponent));
        setSelectedComponent(newComponent);
        notify(`Added new ${metadata.displayName || componentType}`, 'success');

        // Try to place in container
        tryPlaceInContainer(newComponent, position);
    }, [dispatch, setSelectedComponent, notify, tryPlaceInContainer]);

    /**
     * Handle mouse move on stage
     * @param {Event} e - The mouse move event
     */
    const handleMouseMove = useCallback((e) => {
        if (isLineMode && lineStart) {
            handleConnectionMove(e);
        }
    }, [isLineMode, lineStart, handleConnectionMove]);

    /**
     * Handle connection deletion
     * @param {string} connectionId - ID of the connection to delete
     */
    const handleDeleteConnection = useCallback((connectionId) => {
        dispatch(removeConnection(connectionId));
        setSelectedConnection(null);
        notify('Connection deleted', 'info');
        console.log(`Connection ${connectionId} deleted`);
    }, [dispatch, notify]);

    /**
     * Render connection lines between components
     */
    const renderConnections = useMemo(() => {
        // Filter out containment connections (VPC-subnet, subnet-resource)
        // as those are represented visually by nesting
        const nonContainmentConnections = connections.filter(conn => {
            const sourceComp = canvasComponents.find(c => c.id === conn.from);
            const targetComp = canvasComponents.find(c => c.id === conn.to);

            if (!sourceComp || !targetComp) return false;

            // Skip VPC-subnet connections
            if (
                (sourceComp.type === 'vpc' && targetComp.type === 'subnet') ||
                (sourceComp.type === 'subnet' && targetComp.type === 'vpc')
            ) {
                return false;
            }

            // Skip subnet-resource connections
            const resourceToSubnetMap = new Map();
            connections.forEach(c => {
                const fromComp = canvasComponents.find(comp => comp.id === c.from);
                const toComp = canvasComponents.find(comp => comp.id === c.to);

                if (fromComp && toComp) {
                    if (fromComp.type !== 'vpc' && fromComp.type !== 'subnet' && toComp.type === 'subnet') {
                        resourceToSubnetMap.set(fromComp.id, toComp.id);
                    } else if (toComp.type !== 'vpc' && toComp.type !== 'subnet' && fromComp.type === 'subnet') {
                        resourceToSubnetMap.set(toComp.id, fromComp.id);
                    }
                }
            });

            if (resourceToSubnetMap.has(sourceComp.id) || resourceToSubnetMap.has(targetComp.id)) {
                return false;
            }

            return true;
        });

        return nonContainmentConnections.map(conn => {
            const sourceComp = canvasComponents.find(c => c.id === conn.from);
            const targetComp = canvasComponents.find(c => c.id === conn.to);

            if (!sourceComp || !targetComp) return null;

            return (
                <ConnectionLine
                    key={conn.id}
                    connection={conn}
                    sourceComponent={sourceComp}
                    targetComponent={targetComp}
                    isSelected={selectedConnection === conn.id}
                    onClick={() => setSelectedConnection(conn.id)}
                    onDelete={() => handleDeleteConnection(conn.id)}
                />
            );
        });
    }, [canvasComponents, connections, selectedConnection, handleDeleteConnection]);

    return (
        <div className="canvas-container relative h-full w-full">
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
                    {/* Render canvas grid */}
                    <CanvasGrid width={canvasSize.width} height={canvasSize.height} scale={scale} />

                    {/* Render components */}
                    <Group>
                        {canvasComponents.map(component => (
                            <AwsComponent
                                key={component.id}
                                component={component}
                                isSelected={selectedComponent?.id === component.id}
                                isConnectable={isLineMode}
                                isValidTarget={isLineMode && lineStart && lineStart.id !== component.id}
                                onClick={(e) => handleComponentClick(e, component)}
                                onDragMove={(e) => handleDragMove(e, component.id)}
                                onDragEnd={(e) => handleDragEnd(e, component.id)}
                            />
                        ))}
                    </Group>

                    {/* Render connections */}
                    <Group>
                        {renderConnections}

                        {/* Render ghostLine for active connections */}
                        {ghostLine && (
                            <ConnectionLine
                                isGhost={true}
                                points={ghostLine.points}
                            />
                        )}
                    </Group>
                </Layer>
            </Stage>

            {/* Component drop overlay for drag-and-drop */}
            <div
                className="component-drop-overlay"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    const componentType = e.dataTransfer.getData('component-type');
                    if (!componentType) {
                        console.warn('No component type found in drop data');
                        return;
                    }

                    const stageRect = stageRef.current.container().getBoundingClientRect();
                    const stage = stageRef.current.getStage();

                    // Calculate position in stage coordinates
                    const x = (e.clientX - stageRect.left - position.x) / scale;
                    const y = (e.clientY - stageRect.top - position.y) / scale;

                    console.log(`Dropping component ${componentType} at position (${x}, ${y})`);

                    handleComponentDrop(componentType, { x, y });
                }}
            />

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
        </div>
    );
};

export default OptimizedCanvasContainer;