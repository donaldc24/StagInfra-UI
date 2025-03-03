// Update the import section in src/components/canvas/OptimizedCanvasContainer.js
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Group } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { ZoomIn, ZoomOut, Move, X, Plus, Layers, Trash2 } from 'lucide-react'; // Add Trash2 here

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
import { getComponentMetadata, getDefaultProperties } from '../../services/awsComponentRegistry';
import { validateConnection } from '../../services/hierarchicalConnectionValidator';

// Import custom hooks
import useConnectionMode from '../../hooks/useConnectionMode';
import useCanvasControls from '../../hooks/useCanvasControls';
import useNotification from '../../hooks/useNotification';

/**
 * Canvas Container component - the main drawing area for the application
 * This implementation improves performance and fixes existing issues
 */
const OptimizedCanvasContainer = () => {
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
    const { showNotification } = useNotification();
    const {
        scale,
        position,
        handleZoomIn,
        handleZoomOut,
        handleWheel,
        resetView
    } = useCanvasControls();

    const {
        ghostLine,
        handleConnectionStart,
        handleConnectionMove,
        handleConnectionComplete,
        handleConnectionCancel
    } = useConnectionMode(stageRef, canvasComponents, connections, dispatch);

    // Memoized canvas size
    const canvasSize = useMemo(() => ({
        width: window.innerWidth - 300, // Adjust based on sidebar width
        height: window.innerHeight - 60 // Adjust based on header height
    }), []);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            // Update canvas size if needed
            // This could be implemented with state if required
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Key event handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Delete selected component
            if (e.key === 'Delete' && selectedComponent) {
                dispatch(removeComponent(selectedComponent.id));
                dispatch(removeComponentConnections(selectedComponent.id));
                setSelectedComponent(null);
                showNotification('Component deleted', 'info');
            }

            // Delete selected connection
            if (e.key === 'Delete' && selectedConnection) {
                dispatch(removeConnection(selectedConnection));
                setSelectedConnection(null);
                showNotification('Connection deleted', 'info');
            }

            // Escape to cancel connection mode
            if (e.key === 'Escape' && isLineMode) {
                dispatch(setLineMode(false));
                dispatch(setLineStart(null));
                handleConnectionCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch, selectedComponent, selectedConnection, isLineMode, handleConnectionCancel, showNotification]);

    /**
     * Handle component selection
     * @param {Object} component - The component to select
     * @param {Event} e - The event object
     */
    const handleComponentClick = useCallback((component, e) => {
        e.evt.preventDefault();
        e.cancelBubble = true; // Stop propagation in Konva

        if (isLineMode) {
            if (!lineStart) {
                // Start connection from this component
                handleConnectionStart(component);
            } else if (lineStart.id !== component.id) {
                // Complete connection to this component
                handleConnectionComplete(component);
            }
        } else {
            // Normal selection
            setSelectedComponent(prev => prev?.id === component.id ? null : component);
            setSelectedConnection(null);
        }
    }, [isLineMode, lineStart, handleConnectionStart, handleConnectionComplete]);

    /**
     * Handle stage background click (deselect everything)
     */
    const handleStageClick = useCallback((e) => {
        // Only handle clicks directly on the stage, not on components
        if (e.target === e.currentTarget) {
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
        // Update component position in Redux
        const newPosition = {
            x: e.target.x(),
            y: e.target.y()
        };

        dispatch(updateComponentPosition({
            id: componentId,
            position: newPosition
        }));

        // If it's a container, need to update contained components' positions
        const component = canvasComponents.find(c => c.id === componentId);
        if (component && (component.type === 'vpc' || component.type === 'subnet')) {
            // Implementation for updating contained components would go here
        }
    }, [dispatch, canvasComponents]);

    /**
     * Handle component drag end
     * @param {Event} e - The drag end event
     * @param {string} componentId - ID of the component that was dragged
     */
    const handleDragEnd = useCallback((e, componentId) => {
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        const component = canvasComponents.find(c => c.id === componentId);

        // Check if component is dropped in trash area
        const inTrashArea =
            pointerPosition.x > (canvasSize.width - 100) &&
            pointerPosition.y < 150;

        if (inTrashArea && component) {
            // Delete the component
            dispatch(removeComponent(componentId));
            dispatch(removeComponentConnections(componentId));
            setSelectedComponent(null);
            showNotification(`Deleted ${component.type} component`, 'success');
        } else if (component) {
            // Check if dropping into a container
            tryPlaceInContainer(component, pointerPosition);
        }
    }, [dispatch, canvasComponents, canvasSize, showNotification]);

    /**
     * Try to place a component in a container (VPC or subnet)
     * @param {Object} component - The component to place
     * @param {Object} position - The position {x, y} to check
     */
    const tryPlaceInContainer = useCallback((component, position) => {
        // Don't try to place container components inside other containers
        if (component.type === 'vpc') return;

        // For subnet, only check if it's in a VPC
        if (component.type === 'subnet') {
            const vpcs = canvasComponents.filter(c => c.type === 'vpc');

            for (const vpc of vpcs) {
                if (isPositionInComponent(position, vpc)) {
                    const validation = validateConnection(component, vpc, canvasComponents, connections);

                    if (validation.valid) {
                        // Check if subnet is already in another VPC
                        const existingConnection = connections.find(conn =>
                            (conn.from === component.id && canvasComponents.find(c => c.id === conn.to)?.type === 'vpc') ||
                            (conn.to === component.id && canvasComponents.find(c => c.id === conn.from)?.type === 'vpc')
                        );

                        if (existingConnection) {
                            // Remove existing connection
                            dispatch(removeConnection(existingConnection.id));
                        }

                        // Add new connection
                        dispatch(addConnection({
                            id: `${component.id}-${vpc.id}`,
                            from: component.id,
                            to: vpc.id
                        }));

                        showNotification(`Placed subnet in ${vpc.name || 'VPC'}`, 'success');
                    } else {
                        showNotification(validation.message, 'error');
                    }
                    return;
                }
            }
        } else {
            // For non-subnet components, check if they're in a subnet
            const subnets = canvasComponents.filter(c => c.type === 'subnet');

            for (const subnet of subnets) {
                if (isPositionInComponent(position, subnet)) {
                    const validation = validateConnection(component, subnet, canvasComponents, connections);

                    if (validation.valid) {
                        // Check if resource is already in another subnet
                        const existingConnection = connections.find(conn =>
                            (conn.from === component.id && canvasComponents.find(c => c.id === conn.to)?.type === 'subnet') ||
                            (conn.to === component.id && canvasComponents.find(c => c.id === conn.from)?.type === 'subnet')
                        );

                        if (existingConnection) {
                            // Remove existing connection
                            dispatch(removeConnection(existingConnection.id));
                        }

                        // Add new connection
                        dispatch(addConnection({
                            id: `${component.id}-${subnet.id}`,
                            from: component.id,
                            to: subnet.id
                        }));

                        showNotification(`Placed resource in ${subnet.name || 'subnet'}`, 'success');
                    } else {
                        showNotification(validation.message, 'error');
                    }
                    return;
                }
            }
        }
    }, [dispatch, canvasComponents, connections, showNotification]);

    /**
     * Check if a position is inside a component's boundaries
     * @param {Object} position - The position {x, y} to check
     * @param {Object} component - The component to check against
     * @returns {boolean} - Whether the position is inside the component
     */
    const isPositionInComponent = useCallback((position, component) => {
        return (
            position.x >= component.x &&
            position.x <= component.x + (component.width || 40) &&
            position.y >= component.y &&
            position.y <= component.y + (component.height || 40)
        );
    }, []);

    /**
     * Handle dropping a new component onto the canvas
     * @param {string} componentType - The type of component to add
     * @param {Object} position - Position {x, y} where to add the component
     */
    const handleComponentDrop = useCallback((componentType, position) => {
        // Only handle valid component types
        if (!componentType || !getComponentMetadata(componentType)) return;

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

        // Add to Redux store
        dispatch(addComponent(newComponent));
        setSelectedComponent(newComponent);
        showNotification(`Added new ${metadata.displayName || componentType}`, 'success');

        // Try to place in container
        tryPlaceInContainer(newComponent, position);
    }, [dispatch, tryPlaceInContainer, showNotification]);

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
        showNotification('Connection deleted', 'info');
    }, [dispatch, showNotification]);

    /**
     * Render containment hierarchy
     * Groups components by their container relationships
     */
    const renderComponentHierarchy = useMemo(() => {
        // Find all VPCs
        const vpcs = canvasComponents.filter(comp => comp.type === 'vpc');

        // Find all subnets
        const subnets = canvasComponents.filter(comp => comp.type === 'subnet');

        // Map subnets to their parent VPCs
        const subnetToVpcMap = new Map();
        connections.forEach(conn => {
            const fromComp = canvasComponents.find(c => c.id === conn.from);
            const toComp = canvasComponents.find(c => c.id === conn.to);

            if (fromComp && toComp) {
                if (fromComp.type === 'subnet' && toComp.type === 'vpc') {
                    subnetToVpcMap.set(fromComp.id, toComp.id);
                } else if (fromComp.type === 'vpc' && toComp.type === 'subnet') {
                    subnetToVpcMap.set(toComp.id, fromComp.id);
                }
            }
        });

        // Map resources to their parent subnets
        const resourceToSubnetMap = new Map();
        connections.forEach(conn => {
            const fromComp = canvasComponents.find(c => c.id === conn.from);
            const toComp = canvasComponents.find(c => c.id === conn.to);

            if (fromComp && toComp) {
                if (fromComp.type !== 'vpc' && fromComp.type !== 'subnet' && toComp.type === 'subnet') {
                    resourceToSubnetMap.set(fromComp.id, toComp.id);
                } else if (toComp.type !== 'vpc' && toComp.type !== 'subnet' && fromComp.type === 'subnet') {
                    resourceToSubnetMap.set(toComp.id, fromComp.id);
                }
            }
        });

        // Find standalone components (not in any container)
        const standaloneComponents = canvasComponents.filter(comp => {
            return comp.type !== 'vpc' &&
                !subnetToVpcMap.has(comp.id) &&
                !resourceToSubnetMap.has(comp.id);
        });

        // Create the rendering hierarchy
        return (
            <>
                {/* Render VPC containers first */}
                {vpcs.map(vpc => {
                    // Find subnets in this VPC
                    const vpcSubnets = subnets.filter(subnet =>
                        subnetToVpcMap.get(subnet.id) === vpc.id
                    );

                    return (
                        <ContainerComponent
                            key={vpc.id}
                            component={vpc}
                            isSelected={selectedComponent?.id === vpc.id}
                            onClick={(e) => handleComponentClick(vpc, e)}
                            onDragMove={(e) => handleDragMove(e, vpc.id)}
                            onDragEnd={(e) => handleDragEnd(e, vpc.id)}
                        >
                            {/* Render subnets inside this VPC */}
                            {vpcSubnets.map(subnet => {
                                // Find resources in this subnet
                                const subnetResources = canvasComponents.filter(res =>
                                    resourceToSubnetMap.get(res.id) === subnet.id
                                );

                                return (
                                    <ContainerComponent
                                        key={subnet.id}
                                        component={subnet}
                                        isSelected={selectedComponent?.id === subnet.id}
                                        onClick={(e) => handleComponentClick(subnet, e)}
                                        onDragMove={(e) => handleDragMove(e, subnet.id)}
                                        onDragEnd={(e) => handleDragEnd(e, subnet.id)}
                                    >
                                        {/* Render resources inside this subnet */}
                                        {subnetResources.map(resource => (
                                            <AwsComponent
                                                key={resource.id}
                                                component={resource}
                                                isSelected={selectedComponent?.id === resource.id}
                                                isConnectable={isLineMode}
                                                isValidTarget={isLineMode && lineStart && lineStart.id !== resource.id}
                                                onClick={(e) => handleComponentClick(resource, e)}
                                                onDragMove={(e) => handleDragMove(e, resource.id)}
                                                onDragEnd={(e) => handleDragEnd(e, resource.id)}
                                            />
                                        ))}
                                    </ContainerComponent>
                                );
                            })}
                        </ContainerComponent>
                    );
                })}

                {/* Render standalone subnets (not in a VPC) */}
                {subnets.filter(subnet => !subnetToVpcMap.has(subnet.id)).map(subnet => {
                    // Find resources in this subnet
                    const subnetResources = canvasComponents.filter(res =>
                        resourceToSubnetMap.get(res.id) === subnet.id
                    );

                    return (
                        <ContainerComponent
                            key={subnet.id}
                            component={subnet}
                            isSelected={selectedComponent?.id === subnet.id}
                            onClick={(e) => handleComponentClick(subnet, e)}
                            onDragMove={(e) => handleDragMove(e, subnet.id)}
                            onDragEnd={(e) => handleDragEnd(e, subnet.id)}
                        >
                            {/* Render resources inside this subnet */}
                            {subnetResources.map(resource => (
                                <AwsComponent
                                    key={resource.id}
                                    component={resource}
                                    isSelected={selectedComponent?.id === resource.id}
                                    isConnectable={isLineMode}
                                    isValidTarget={isLineMode && lineStart && lineStart.id !== resource.id}
                                    onClick={(e) => handleComponentClick(resource, e)}
                                    onDragMove={(e) => handleDragMove(e, resource.id)}
                                    onDragEnd={(e) => handleDragEnd(e, resource.id)}
                                />
                            ))}
                        </ContainerComponent>
                    );
                })}

                {/* Render standalone components (not in any container) */}
                {standaloneComponents.map(component => (
                    <AwsComponent
                        key={component.id}
                        component={component}
                        isSelected={selectedComponent?.id === component.id}
                        isConnectable={isLineMode}
                        isValidTarget={isLineMode && lineStart && lineStart.id !== component.id}
                        onClick={(e) => handleComponentClick(component, e)}
                        onDragMove={(e) => handleDragMove(e, component.id)}
                        onDragEnd={(e) => handleDragEnd(e, component.id)}
                    />
                ))}
            </>
        );
    }, [canvasComponents, connections, selectedComponent, isLineMode, lineStart, handleComponentClick, handleDragMove, handleDragEnd]);

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

                    {/* Render components according to hierarchy */}
                    <Group>
                        {renderComponentHierarchy}
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

            {/* Zoom controls */}
            <div className="zoom-controls">
                <button className="zoom-button" onClick={handleZoomIn}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </button>
                <div className="zoom-value">{Math.round(scale * 100)}%</div>
                <button className="zoom-button" onClick={handleZoomOut}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </button>
                <button className="zoom-button" onClick={resetView}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="5 9 2 12 5 15"></polyline>
                        <polyline points="9 5 12 2 15 5"></polyline>
                        <polyline points="15 19 12 22 9 19"></polyline>
                        <polyline points="19 9 22 12 19 15"></polyline>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="12" y1="2" x2="12" y2="22"></line>
                    </svg>
                </button>
            </div>

            {/* Connection mode indicator */}
            {isLineMode && (
                <div className="connection-mode-indicator">
    <span className="connection-mode-indicator-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    </span>
                    <span>Connection Mode Active</span>
                    <button
                        className="connection-mode-close"
                        onClick={() => dispatch(setLineMode(false))}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            )}

            {/* Component drop overlay for drag-and-drop */}
            <div
                className="absolute inset-0 pointer-events-none"
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    const componentType = e.dataTransfer.getData('component-type');
                    if (!componentType) return;

                    const stageRect = stageRef.current.container().getBoundingClientRect();
                    const x = (e.clientX - stageRect.left - position.x) / scale;
                    const y = (e.clientY - stageRect.top - position.y) / scale;

                    handleComponentDrop(componentType, { x, y });
                }}
            />

            {/* Trash area */}
            <div className="trash-area">
                <svg className="trash-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                <span className="trash-text">Drop to Delete</span>
            </div>
        </div>
    );
};

export default OptimizedCanvasContainer;