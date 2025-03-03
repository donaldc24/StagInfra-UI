// src/components/HierarchicalCanvasContainer.js
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import HierarchicalCanvas from './HierarchicalCanvas';
import ReactSidebar from './ReactSidebar';
import {
    setDraggingComponent,
    setGhostLine,
    addComponent,
    updateComponentPosition,
    selectComponents,
    selectDraggingComponent,
    removeComponent,
    updateComponent
} from '../store/slices/componentsSlice';
import {
    setLineMode,
    setLineStart
} from '../store/slices/uiStateSlice';
import {
    addConnection,
    clearConnections,
    removeConnection,
    removeComponentConnections
} from '../store/slices/connectionsSlice';
import { getComponentMetadata, getDefaultProperties } from '../services/awsComponentRegistry';
import { validateConnection } from '../services/hierarchicalConnectionValidator';

function HierarchicalCanvasContainer() {
    const dispatch = useDispatch();
    const stageRef = useRef(null);

    const { activeTab, isLineMode, lineStart } = useSelector(state => state.uiState);
    const canvasComponents = useSelector(selectComponents);
    const connections = useSelector(state => state.connections);
    const draggingComponent = useSelector(selectDraggingComponent);
    const [ghostLine, setLocalGhostLine] = useState(null);
    const [validationMessage, setValidationMessage] = useState('');

    // Add a timer reference to clear validation messages
    const validationTimerRef = useRef(null);

    // Clear validation message after a timeout
    useEffect(() => {
        if (validationMessage) {
            // Clear any existing timer
            if (validationTimerRef.current) {
                clearTimeout(validationTimerRef.current);
            }

            // Set a new timer to clear the message after 3 seconds
            validationTimerRef.current = setTimeout(() => {
                setValidationMessage('');
            }, 3000);
        }

        // Cleanup on unmount
        return () => {
            if (validationTimerRef.current) {
                clearTimeout(validationTimerRef.current);
            }
        };
    }, [validationMessage]);

    const handleSelectComponent = (type) => {
        if (!type) return;

        const stage = stageRef.current;
        if (!stage) return;

        const center = {
            x: 500, // center of the canvas area (200 + 600/2)
            y: 200  // center of the canvas height
        };

        // Create a new component with default properties and dimensions based on type
        const defaultProps = getDefaultProperties(type);
        const metadata = getComponentMetadata(type) || {};

        // Set default size based on component type
        let width = 40;
        let height = 40;

        // Containers (VPC, subnet) should have larger default dimensions
        if (type === 'vpc') {
            width = 300;
            height = 250;
        } else if (type === 'subnet') {
            width = 200;
            height = 150;
        }

        // Set as dragging component to allow placement
        dispatch(setDraggingComponent({
            type,
            x: center.x,
            y: center.y,
            width,
            height,
            color: metadata.color,
            ...defaultProps
        }));
    };

    const handleMouseDown = (type, e) => {
        if (!isLineMode && type) {
            const stage = e.target.getStage();
            const pointerPosition = stage.getPointerPosition();

            // Create a new dragging component with default properties from registry
            const defaultProps = getDefaultProperties(type);
            const metadata = getComponentMetadata(type) || {};

            // Set default size based on component type
            let width = 40;
            let height = 40;

            // Containers (VPC, subnet) should have larger default dimensions
            if (type === 'vpc') {
                width = 300;
                height = 250;
            } else if (type === 'subnet') {
                width = 200;
                height = 150;
            }

            dispatch(setDraggingComponent({
                type,
                x: pointerPosition.x,
                y: pointerPosition.y,
                width,
                height,
                color: metadata.color,
                ...defaultProps
            }));
        }
    };

    const handleMouseMove = (e) => {
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();

        if (draggingComponent && !isLineMode) {
            dispatch(setDraggingComponent({
                ...draggingComponent,
                x: pointerPosition.x,
                y: pointerPosition.y
            }));
        } else if (isLineMode && lineStart) {
            setLocalGhostLine({
                points: [
                    lineStart.x + lineStart.width / 2,
                    lineStart.y + lineStart.height / 2,
                    pointerPosition.x,
                    pointerPosition.y,
                ],
            });
        }
    };

    const handleMouseUp = (e) => {
        if (!isLineMode && draggingComponent && draggingComponent.type) {
            const stage = e.target.getStage();
            const pointerPosition = stage.getPointerPosition();

            // Only place component if it's within the canvas area
            if (pointerPosition.x >= 200 && pointerPosition.x <= 800 &&
                pointerPosition.y >= 0 && pointerPosition.y <= 400) {

                const newComponent = {
                    id: `${draggingComponent.type}-${Date.now()}`,
                    x: pointerPosition.x,
                    y: pointerPosition.y,
                    width: draggingComponent.width || 40,
                    height: draggingComponent.height || 40,
                    type: draggingComponent.type,
                    ...getDefaultProperties(draggingComponent.type)
                };

                dispatch(addComponent(newComponent));

                // Place component in container if dropped in one
                tryPlaceInContainer(newComponent, pointerPosition);
            }

            dispatch(setDraggingComponent(null));
        }
    };

    // Try to place a component in a container (VPC or subnet) if it's dropped inside one
    const tryPlaceInContainer = (component, position) => {
        // Don't try to place containers in other containers
        if (component.type === 'vpc' || component.type === 'subnet') {
            return;
        }

        // Check if component is dropped inside a subnet
        const subnets = canvasComponents.filter(comp => comp.type === 'subnet');
        for (const subnet of subnets) {
            if (
                position.x >= subnet.x &&
                position.x <= subnet.x + subnet.width &&
                position.y >= subnet.y &&
                position.y <= subnet.y + subnet.height
            ) {
                // Create an automatic connection between the resource and subnet
                const validation = validateConnection(component, subnet, canvasComponents, connections);
                if (validation.valid) {
                    dispatch(addConnection({
                        id: `${component.id}-${subnet.id}`,
                        from: component.id,
                        to: subnet.id
                    }));
                }
                return;
            }
        }

        // If not in a subnet, check if component is dropped inside a VPC
        const vpcs = canvasComponents.filter(comp => comp.type === 'vpc');
        for (const vpc of vpcs) {
            if (
                position.x >= vpc.x &&
                position.x <= vpc.x + vpc.width &&
                position.y >= vpc.y &&
                position.y <= vpc.y + vpc.height
            ) {
                // For resources, we prefer they go in subnets, not directly in VPCs
                // But if it's a subnet, we can place it in the VPC
                if (component.type === 'subnet') {
                    const validation = validateConnection(component, vpc, canvasComponents, connections);
                    if (validation.valid) {
                        dispatch(addConnection({
                            id: `${component.id}-${vpc.id}`,
                            from: component.id,
                            to: vpc.id
                        }));
                    }
                }
                return;
            }
        }
    };

    const handleComponentClick = (comp, e) => {
        e.evt.preventDefault();
        if (isLineMode) {
            if (!lineStart) {
                dispatch(setLineStart(comp));
                setValidationMessage('');
            } else if (lineStart.id !== comp.id) {
                // Validate the connection
                const validationResult = validateConnection(lineStart, comp, canvasComponents, connections);

                if (validationResult.valid) {
                    dispatch(addConnection({
                        id: `${lineStart.id}-${comp.id}`,
                        from: lineStart.id,
                        to: comp.id
                    }));
                    dispatch(setLineStart(null));
                    setLocalGhostLine(null);
                    dispatch(setLineMode(false));
                    setValidationMessage('');
                } else {
                    setValidationMessage(validationResult.message);
                }
            }
        } else {
            // When not in line mode, clicking selects a component
            dispatch(setLineStart(comp));
        }
    };

    const handleDragMove = (e, compId) => {
        const component = canvasComponents.find(c => c.id === compId);
        if (!component) return;

        dispatch(updateComponentPosition({
            id: compId,
            position: { x: e.target.x(), y: e.target.y() }
        }));

        // If a container is being moved, we need to move its contained components too
        if (component.type === 'vpc' || component.type === 'subnet') {
            updateContainedComponentsPosition(component);
        }
    };

    // When a container is moved, update the positions of all contained components
    const updateContainedComponentsPosition = (container) => {
        // Find all connections to this container
        const containmentConnections = connections.filter(conn =>
            conn.from === container.id || conn.to === container.id
        );

        // For each connection, find the component that's contained
        containmentConnections.forEach(conn => {
            const containedId = conn.from === container.id ? conn.to : conn.from;
            const containedComponent = canvasComponents.find(c => c.id === containedId);

            // Skip if it's a connection between two containers
            if (containedComponent?.type === 'vpc' || containedComponent?.type === 'subnet') {
                return;
            }

            // Update the contained component's position relative to the container
            if (containedComponent) {
                // This would maintain the relative position
                dispatch(updateComponentPosition({
                    id: containedId,
                    position: {
                        x: container.x + (containedComponent.x - container.x),
                        y: container.y + (containedComponent.y - container.y)
                    }
                }));
            }
        });
    };

    const handleDragEnd = (e, compId) => {
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        const component = canvasComponents.find(c => c.id === compId);

        // If dragged to trash area
        if (
            pointerPosition &&
            pointerPosition.x >= 800 &&
            pointerPosition.x <= 1000 &&
            pointerPosition.y >= 0 &&
            pointerPosition.y <= 200
        ) {
            // Delete the component
            dispatch(removeComponent(compId));

            // Also remove any connections involving this component
            dispatch(removeComponentConnections(compId));
        }
        // Otherwise, check if the component should be placed in a container
        else if (component && component.type !== 'vpc') {
            tryPlaceInContainer(component, pointerPosition);
        }
    };

    const handleClearConnections = () => {
        dispatch(clearConnections());
    };

    const handleDeleteConnection = (connectionId) => {
        dispatch(removeConnection(connectionId));
    };

    const handleToggleLineMode = (isActive) => {
        dispatch(setLineMode(isActive));
        if (!isActive) {
            dispatch(setLineStart(null));
            setLocalGhostLine(null);
        }
    };

    // Handle component resize for containers (VPC, subnet)
    const handleResizeContainer = (id, newSize) => {
        dispatch(updateComponent({
            id,
            changes: {
                width: newSize.width,
                height: newSize.height
            }
        }));
    };

    return (
        <div style={{ position: 'relative' }}>
            {validationMessage && (
                <div className="validation-message" style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#ffe6e6',
                    border: '1px solid #ffb3b3',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    zIndex: 100
                }}>
                    {validationMessage}
                </div>
            )}

            <Stage
                ref={stageRef}
                width={1000}
                height={400}
                onMouseDown={(e) => handleMouseDown(null, e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <Layer>
                    <HierarchicalCanvas
                        canvasComponents={canvasComponents}
                        connections={connections}
                        isLineMode={isLineMode}
                        lineStart={lineStart}
                        ghostLine={ghostLine}
                        draggingComponent={draggingComponent}
                        handleComponentClick={handleComponentClick}
                        handleDragMove={handleDragMove}
                        handleDragEnd={handleDragEnd}
                        handleDeleteConnection={handleDeleteConnection}
                        handleResizeContainer={handleResizeContainer}
                    />
                </Layer>
            </Stage>

            <ReactSidebar
                onSelectComponent={handleSelectComponent}
                onToggleLineMode={handleToggleLineMode}
                onClearConnections={handleClearConnections}
            />
        </div>
    );
}

export default HierarchicalCanvasContainer;