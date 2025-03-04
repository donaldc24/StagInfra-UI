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
import { getComponentMetadata } from '../../services/aws';

// Debug utility for tracking drag events
const useDragEventDebugger = (isDebugEnabled) => {
    useEffect(() => {
        if (!isDebugEnabled) return;

        // Create a div for debugging if it doesn't exist
        let debugDiv = document.getElementById('drag-event-debug');
        if (!debugDiv) {
            debugDiv = document.createElement('div');
            debugDiv.id = 'drag-event-debug';
            debugDiv.style.position = 'fixed';
            debugDiv.style.bottom = '10px';
            debugDiv.style.right = '10px';
            debugDiv.style.width = '300px';
            debugDiv.style.height = '200px';
            debugDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
            debugDiv.style.color = 'white';
            debugDiv.style.padding = '10px';
            debugDiv.style.overflow = 'auto';
            debugDiv.style.fontFamily = 'monospace';
            debugDiv.style.fontSize = '12px';
            debugDiv.style.zIndex = '9999';
            document.body.appendChild(debugDiv);
        }

        // Clear the debug div
        debugDiv.innerHTML = '<h3>Drag Event Debug</h3>';

        // Function to log events
        window.logDragEvent = (eventType, componentId, componentType) => {
            const entry = document.createElement('div');
            entry.textContent = `${eventType}: ${componentType} (${componentId ? componentId.slice(-4) : 'unknown'})`;
            entry.style.borderBottom = '1px solid #333';
            entry.style.padding = '2px 0';

            // Different colors for different events
            if (eventType.includes('start')) entry.style.color = '#4caf50';
            if (eventType.includes('move')) entry.style.color = '#2196f3';
            if (eventType.includes('end')) entry.style.color = '#ff9800';

            // Add timestamp
            const time = new Date();
            const timeStr = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}.${time.getMilliseconds()}`;
            entry.textContent = `[${timeStr}] ${entry.textContent}`;

            // Keep only last 20 entries
            if (debugDiv.children.length > 20) {
                debugDiv.removeChild(debugDiv.children[1]);
            }

            debugDiv.appendChild(entry);
        };

        return () => {
            // Cleanup
            window.logDragEvent = undefined;
            if (debugDiv) {
                document.body.removeChild(debugDiv);
            }
        };
    }, [isDebugEnabled]);

    return {
        logDragEvent: (eventType, componentId, componentType) => {
            if (isDebugEnabled && window.logDragEvent) {
                window.logDragEvent(eventType, componentId, componentType);
            }
        }
    };
};

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
    const [isDebugEnabled, setIsDebugEnabled] = useState(false);

    // Canvas controls (zoom, pan)
    const {
        scale,
        position,
        handleZoomIn,
        handleZoomOut,
        handleWheel,
        resetView
    } = useCanvasControls();

    // Debug utility
    const { logDragEvent } = useDragEventDebugger(isDebugEnabled);

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

    // Add keyboard shortcut for debug mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'd' && e.ctrlKey) {
                setIsDebugEnabled(prev => !prev);
                console.log('Debug mode toggled:', !isDebugEnabled);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDebugEnabled]);

    // Organize components by container
    const organizedComponents = useMemo(() => {
        // Start with containers (VPCs, Subnets)
        const containers = canvasComponents.filter(comp => {
            const metadata = getComponentMetadata(comp.type);
            return metadata && metadata.isContainer;
        });

        // Sort containers so parent containers (VPCs) come before child containers (Subnets)
        const sortedContainers = [...containers].sort((a, b) => {
            // If b is contained by a, a should come first
            if (b.containerId === a.id) return -1;
            // If a is contained by b, b should come first
            if (a.containerId === b.id) return 1;

            // VPCs should come before subnets
            if (a.type === 'vpc' && b.type === 'subnet') return -1;
            if (a.type === 'subnet' && b.type === 'vpc') return 1;

            // Otherwise maintain existing order
            return 0;
        });

        // Map to hold contained components
        const containedComponents = new Map();
        sortedContainers.forEach(container => {
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
        const standaloneComponents = canvasComponents.filter(comp => {
            // A component is standalone if it's not a container and not contained by anything
            const isContainer = getComponentMetadata(comp.type)?.isContainer;
            return !comp.containerId && !isContainer;
        });

        return {
            containers: sortedContainers,
            containedComponents,
            standaloneComponents
        };
    }, [canvasComponents]);
    
    const isPointInContainer = useCallback((x, y, container) => {
        // Add debugging log
        if (isDebugEnabled) {
            console.log(`Checking if point (${x}, ${y}) is in container:`, container.id, container.type);
        }

        // Make sure we have valid dimensions
        const containerWidth = container.width || 300;
        const containerHeight = container.height || 200;

        const result = (
            x >= container.x &&
            x <= container.x + containerWidth &&
            y >= container.y &&
            y <= container.y + containerHeight
        );

        if (isDebugEnabled && result) {
            console.log(`Point (${x}, ${y}) is inside container ${container.id} (${container.type})`);
        }

        return result;
    }, [isDebugEnabled]);

    const findContainerAt = useCallback((x, y, componentType) => {
        if (isDebugEnabled) {
            console.log(`Finding container at (${x}, ${y}) for component type: ${componentType}`);
        }

        // Get component metadata to check containment rules
        const draggedComponentMetadata = getComponentMetadata(componentType);

        // Check which container types can contain this component
        const allowedContainerTypes = [];

        // Add explicit containment rules
        if (draggedComponentMetadata && draggedComponentMetadata.mustBeContainedBy) {
            allowedContainerTypes.push(...draggedComponentMetadata.mustBeContainedBy);
        }

        if (draggedComponentMetadata && draggedComponentMetadata.canBeContainedBy) {
            allowedContainerTypes.push(...draggedComponentMetadata.canBeContainedBy);
        }

        if (isDebugEnabled) {
            console.log(`Component ${componentType} can be contained by:`, allowedContainerTypes);
        }

        // If component can't be contained, exit early
        if (allowedContainerTypes.length === 0) {
            return null;
        }

        // Get all containers that could potentially contain this component type
        const potentialContainers = organizedComponents.containers.filter(container => {
            // First check if container type is in the allowed list
            if (!allowedContainerTypes.includes(container.type)) {
                return false;
            }

            // Then check if container metadata confirms it can contain this type
            const containerMetadata = getComponentMetadata(container.type);
            return containerMetadata &&
                containerMetadata.canContain &&
                containerMetadata.canContain.includes(componentType);
        });

        if (isDebugEnabled) {
            console.log('Potential containers:', potentialContainers.map(c => `${c.type}-${c.id.slice(-4)}`));
        }

        // Reverse to check top-most containers first (those rendered last)
        const reversedContainers = [...potentialContainers].reverse();

        for (const container of reversedContainers) {
            if (isPointInContainer(x, y, container)) {
                if (isDebugEnabled) {
                    console.log(`Found valid container: ${container.id} (${container.type})`);
                }
                return container;
            }
        }

        if (isDebugEnabled) {
            console.log('No container found for this component type');
        }
        return null;
    }, [isPointInContainer, organizedComponents.containers, isDebugEnabled]);

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

    // 3. handleDragStart function
    const handleDragStart = useCallback((e, componentId) => {
        setIsDragging(true);
        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        logDragEvent('dragStart', componentId, component.type);
        console.log(`Component ${componentId} (${component.type}) drag started`);

        // Add visual feedback
        e.target.setAttrs({
            shadowOffset: { x: 3, y: 3 },
            shadowBlur: 6,
            scaleX: 1.02,
            scaleY: 1.02
        });
    }, [canvasComponents, logDragEvent]);

    // 4. handleDragMove function
    const handleDragMove = useCallback((e, componentId) => {
        if (!isDragging) return;

        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        logDragEvent('dragMove', componentId, component.type);
        console.log(`Component ${componentId} (${component.type}) dragging`);

        // Get current position
        const stage = e.target.getStage();
        const x = e.target.x();
        const y = e.target.y();

        // Check component metadata to see if it can be contained
        const metadata = getComponentMetadata(component.type);
        const canBeContained = !metadata ||
            (metadata.mustBeContainedBy && metadata.mustBeContainedBy.length > 0);

        // Skip container check if this component can't be contained
        if (!canBeContained) {
            console.log(`Component ${component.type} cannot be contained, skipping container check`);
            return;
        }

        // Check if we're over a valid container
        const container = findContainerAt(x, y, component.type);

        // Update highlight state
        setDraggedOverContainer(container ? container.id : null);

        if (container) {
            console.log(`Dragging over container ${container.id} (${container.type})`);
        }
    }, [isDragging, canvasComponents, findContainerAt, getComponentMetadata, logDragEvent]);

    // 5. handleContainerDragMove function
    const handleContainerDragMove = useCallback((e, containerId) => {
        if (!isDragging) return;

        logDragEvent('containerDragMove', containerId, 'container');
        console.log(`Container ${containerId} drag move called`);

        // Get container component
        const container = canvasComponents.find(c => c.id === containerId);
        if (!container) return;

        // Get current position
        const x = e.target.x();
        const y = e.target.y();

        // Check if this container can be contained by another container
        const metadata = getComponentMetadata(container.type);
        const canBeContained = metadata &&
            metadata.mustBeContainedBy &&
            metadata.mustBeContainedBy.length > 0;

        if (canBeContained) {
            console.log(`Container ${container.type} can be contained by:`, metadata.mustBeContainedBy);

            // Check if we're over a valid parent container
            const parentContainer = findContainerAt(x, y, container.type);

            // Update highlight state
            setDraggedOverContainer(parentContainer ? parentContainer.id : null);

            if (parentContainer) {
                console.log(`Container ${containerId} dragging over parent ${parentContainer.id} (${parentContainer.type})`);
            }
        } else {
            console.log(`Container ${container.type} cannot be contained by any other container`);
        }
    }, [isDragging, canvasComponents, findContainerAt, logDragEvent]);

    const handleDragEnd = useCallback((e, componentId) => {
        setIsDragging(false);
        const component = canvasComponents.find(c => c.id === componentId);
        if (!component) return;

        logDragEvent('dragEnd', componentId, component.type);

        // Reset visual effects
        e.target.setAttrs({
            shadowOffset: { x: 0, y: 0 },
            shadowBlur: 0,
            scaleX: 1,
            scaleY: 1
        });

        // Get the new position
        const newX = e.target.x();
        const newY = e.target.y();

        console.log(`Component ${componentId} (${component.type}) drag ended at (${newX}, ${newY})`);

        // Check for trash area drop
        const stage = stageRef.current.getStage();
        const pointerPosition = stage.getPointerPosition();
        const inTrashArea = (
            pointerPosition.x > (canvasSize.width - 150) &&
            pointerPosition.y < 150
        );

        if (inTrashArea) {
            dispatch(removeComponent(componentId));
            dispatch(removeComponentConnections(componentId));
            setSelectedComponentId(null);
            showNotification('Component deleted', 'success');
            return;
        }

        // Container handling
        let updatedContainerId = component.containerId;

        // Check component metadata to see if it can be contained
        const metadata = getComponentMetadata(component.type);
        const canBeContained = !metadata ||
            (metadata.mustBeContainedBy && metadata.mustBeContainedBy.length > 0) ||
            (metadata.canBeContainedBy && metadata.canBeContainedBy.length > 0);

        if (canBeContained) {
            const container = findContainerAt(newX, newY, component.type);

            if (container) {
                updatedContainerId = container.id;
                console.log(`Component ${componentId} dropped in container ${container.id} (${container.type})`);

                showNotification(
                    `Placed ${component.type.toUpperCase()} in ${container.type.toUpperCase()}`,
                    'success'
                );
            } else {
                // If component was previously in a container but is now outside any container
                if (component.containerId) {
                    updatedContainerId = null;
                    console.log(`Component ${componentId} removed from container ${component.containerId}`);
                }
            }
        }

        // Reset highlighted containers
        setDraggedOverContainer(null);

        // Update component position and containment in a single dispatch
        dispatch(updateComponentPosition({
            id: componentId,
            position: { x: newX, y: newY },
            containerId: updatedContainerId
        }));
    }, [dispatch, canvasComponents, canvasSize, showNotification, findContainerAt, logDragEvent]);

    const handleContainerDragEnd = useCallback((e, containerId) => {
        setIsDragging(false);
        const container = canvasComponents.find(c => c.id === containerId);
        if (!container) return;

        logDragEvent('containerDragEnd', containerId, container.type);

        // Get the new position
        const newX = e.target.x();
        const newY = e.target.y();

        console.log(`Container ${containerId} (${container.type}) drag ended at (${newX}, ${newY})`);

        // Calculate movement delta
        const dx = newX - container.x;
        const dy = newY - container.y;

        // Check for trash area drop
        const stage = stageRef.current.getStage();
        const pointerPosition = stage.getPointerPosition();
        const inTrashArea = (
            pointerPosition.x > (canvasSize.width - 150) &&
            pointerPosition.y < 150
        );

        if (inTrashArea) {
            // Find all components contained by this container (including nested ones)
            const getAllContainedComponents = (containerId) => {
                const directComponents = organizedComponents.containedComponents.get(containerId) || [];
                let allComponents = [...directComponents];

                // Find nested containers and their components
                const nestedContainers = directComponents.filter(comp => {
                    const metadata = getComponentMetadata(comp.type);
                    return metadata && metadata.isContainer;
                });

                // Recursively get components from nested containers
                nestedContainers.forEach(nestedContainer => {
                    allComponents = [...allComponents, ...getAllContainedComponents(nestedContainer.id)];
                });

                return allComponents;
            };

            // Get all components nested at any level
            const allContainedComponents = getAllContainedComponents(containerId);

            // Delete all contained components first
            allContainedComponents.forEach(component => {
                dispatch(removeComponent(component.id));
                dispatch(removeComponentConnections(component.id));
            });

            // Then delete the container itself
            dispatch(removeComponent(containerId));
            dispatch(removeComponentConnections(containerId));

            setSelectedComponentId(null);
            showNotification('Container and its contents deleted', 'success');
            return;
        }

        // Container relationship handling
        let updatedContainerId = container.containerId;
        const metadata = getComponentMetadata(container.type);

        // Check if this container can be contained by another container
        const canBeContained = metadata &&
            ((metadata.mustBeContainedBy && metadata.mustBeContainedBy.length > 0) ||
                (metadata.canBeContainedBy && metadata.canBeContainedBy.length > 0));

        // Prevent containers from containing themselves or their parents
        const isValidContainer = (parentContainer) => {
            if (!parentContainer) return true;

            // Can't contain itself
            if (parentContainer.id === containerId) return false;

            // Check if this is an ancestor
            let current = parentContainer;
            while (current) {
                if (current.containerId === containerId) return false;
                current = canvasComponents.find(c => c.id === current.containerId);
            }

            return true;
        };

        if (canBeContained) {
            const parentContainer = findContainerAt(newX, newY, container.type);

            if (parentContainer && isValidContainer(parentContainer)) {
                updatedContainerId = parentContainer.id;
                console.log(`Container ${containerId} placed in parent container ${parentContainer.id} (${parentContainer.type})`);

                showNotification(
                    `Placed ${container.type.toUpperCase()} in ${parentContainer.type.toUpperCase()}`,
                    'success'
                );
            } else if (container.containerId) {
                // Container was removed from its parent
                updatedContainerId = null;
                console.log(`Container ${containerId} removed from parent container ${container.containerId}`);
            }
        }

        // First update the container position and relationships
        dispatch(updateComponentPosition({
            id: containerId,
            position: { x: newX, y: newY },
            containerId: updatedContainerId
        }));

        // Function to update all components inside a container
        const updateAllContainedComponents = (containerId, dx, dy) => {
            const directComponents = organizedComponents.containedComponents.get(containerId) || [];

            // Update direct components
            directComponents.forEach(component => {
                dispatch(updateComponentPosition({
                    id: component.id,
                    position: { x: component.x + dx, y: component.y + dy }
                }));

                // Recursively update nested containers
                const componentMetadata = getComponentMetadata(component.type);
                if (componentMetadata && componentMetadata.isContainer) {
                    updateAllContainedComponents(component.id, dx, dy);
                }
            });
        };

        // Then update all contained components to move with the container
        updateAllContainedComponents(containerId, dx, dy);

        // Reset highlighted containers
        setDraggedOverContainer(null);
    }, [canvasComponents, canvasSize, dispatch, organizedComponents.containedComponents, setDraggedOverContainer, setSelectedComponentId, showNotification, findContainerAt, logDragEvent]);

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

    const renderContainer = useCallback((container) => {
        const isSelected = selectedComponentId === container.id;
        const isHighlighted = draggedOverContainer === container.id;

        // Get directly contained components for this container
        const containedComponents = organizedComponents.containedComponents.get(container.id) || [];

        // Split contained components into nested containers and regular components
        const nestedContainers = containedComponents.filter(comp => {
            const metadata = getComponentMetadata(comp.type);
            return metadata && metadata.isContainer;
        });

        const regularComponents = containedComponents.filter(comp => {
            const metadata = getComponentMetadata(comp.type);
            return !metadata || !metadata.isContainer;
        });

        return (
            <ContainerComponent
                key={container.id}
                component={container}
                isSelected={isSelected}
                isHighlighted={isHighlighted}
                onClick={handleComponentClick}
                onDragStart={(e) => handleDragStart(e, container.id)}
                onDragMove={(e) => handleContainerDragMove(e, container.id)}
                onDragEnd={(e) => handleContainerDragEnd(e, container.id)}
            >
                {/* First render nested containers */}
                {nestedContainers.map(nestedContainer => renderContainer(nestedContainer))}

                {/* Then render regular components */}
                {regularComponents.map(component => (
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
    }, [selectedComponentId, draggedOverContainer, organizedComponents.containedComponents, handleComponentClick, handleDragStart, handleContainerDragMove, handleContainerDragEnd, handleDragMove, handleDragEnd, isLineMode]);

    // 9. Debug helper component
    const ContainerDebugger = () => {
        if (!isDebugEnabled) return null;

        return (
            <div style={{
                position: 'fixed',
                top: 10,
                left: 10,
                width: 300,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: 10,
                borderRadius: 4,
                fontSize: 12,
                zIndex: 9999,
                pointerEvents: 'none'
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Container Debug</h3>

                <div style={{ margin: '5px 0' }}>
                    <strong>Dragging:</strong> {isDragging ? '✓' : '✗'}
                    <span style={{ marginLeft: 10 }}>
                        {draggedOverContainer ? `Over: ${draggedOverContainer.slice(-4)}` : ''}
                    </span>
                </div>

                <div style={{ margin: '5px 0' }}>
                    <strong>Containers:</strong>
                    <ul style={{ margin: '5px 0', padding: '0 0 0 20px' }}>
                        {organizedComponents.containers.map(container => (
                            <li key={container.id}>
                                {container.type} ({container.id.slice(-4)})
                                {draggedOverContainer === container.id &&
                                    <span style={{ color: '#4caf50', marginLeft: 5 }}>ACTIVE</span>
                                }
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ margin: '5px 0' }}>
                    <strong>Containment Rules:</strong>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 5, fontSize: 10 }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Type</th>
                            <th style={{ textAlign: 'left' }}>Is Container</th>
                            <th style={{ textAlign: 'left' }}>Can Be In</th>
                        </tr>
                        </thead>
                        <tbody>
                        {['ec2', 's3', 'vpc', 'subnet', 'rds'].map(type => {
                            const metadata = getComponentMetadata(type);
                            return (
                                <tr key={type}>
                                    <td>{type}</td>
                                    <td>{metadata?.isContainer ? '✓' : '✗'}</td>
                                    <td>{metadata?.mustBeContainedBy?.join(', ') || 'none'}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="canvas-container relative h-full w-full">
            {/* Debug overlay when enabled */}
            {isDebugEnabled && <ContainerDebugger />}

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

                    {/* First render standalone containers (VPCs without a parent) */}
                    {organizedComponents.containers
                        .filter(container => !container.containerId)
                        .map(container => renderContainer(container))}

                    {/* Then render standalone components (not in any container) */}
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