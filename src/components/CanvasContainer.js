import React, { useState, useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import Canvas from './Canvas';
import ReactSidebar from './ReactSidebar';
import {
    setDraggingComponent,
    setGhostLine,
    addComponent,
    updateComponentPosition,
    selectComponents,
    selectDraggingComponent,
    removeComponent
} from '../store/slices/componentsSlice';
import {
    setLineMode,
    setLineStart
} from '../store/slices/uiStateSlice';
import {
    addConnection,
    clearConnections,
    removeConnection
} from '../store/slices/connectionsSlice';
import {getComponentMetadata, getDefaultProperties} from '../services/awsComponentRegistry';
import { validateConnection } from '../services/connectionValidator';

function CanvasContainer() {
    const dispatch = useDispatch();
    const stageRef = useRef(null);

    const { activeTab, isLineMode, lineStart } = useSelector(state => state.uiState);
    const canvasComponents = useSelector(selectComponents);
    const connections = useSelector(state => state.connections);
    const draggingComponent = useSelector(selectDraggingComponent);
    const [ghostLine, setLocalGhostLine] = useState(null);
    const [validationMessage, setValidationMessage] = useState('');

    const handleSelectComponent = (type) => {
        if (!type) return;

        const stage = stageRef.current;
        if (!stage) return;

        const center = {
            x: 500, // center of the canvas area (200 + 600/2)
            y: 200  // center of the canvas height
        };

        // Create a new component with default properties
        const defaultProps = getDefaultProperties(type);
        const metadata = getComponentMetadata(type) || {};

        // Set as dragging component to allow placement
        dispatch(setDraggingComponent({
            type,
            x: center.x,
            y: center.y,
            width: 40,
            height: 40,
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

            dispatch(setDraggingComponent({
                type,
                x: pointerPosition.x,
                y: pointerPosition.y,
                width: 40,
                height: 40,
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
                    width: 40,
                    height: 40,
                    type: draggingComponent.type,
                    ...getDefaultProperties(draggingComponent.type)
                };

                dispatch(addComponent(newComponent));
            }

            dispatch(setDraggingComponent(null));
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
                const validationResult = validateConnection(lineStart, comp);

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
    };

    const handleDragEnd = (e, compId) => {
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();

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
            connections.forEach(conn => {
                if (conn.from === compId || conn.to === compId) {
                    dispatch(removeConnection(conn.id));
                }
            });
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
                    <Canvas
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

export default CanvasContainer;