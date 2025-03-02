import React from 'react';
import { Stage, Layer } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import Canvas from './Canvas';
import Sidebar from './Sidebar';
import {
    setDraggingComponent,
    setGhostLine,
    addComponent,
    updateComponentPosition,
    selectComponents,
    selectDraggingComponent
} from '../store/slices/componentsSlice';
import {
    setLineMode,
    setLineStart
} from '../store/slices/uiStateSlice';
import {
    addConnection,
    clearConnections
} from '../store/slices/connectionsSlice';
import { getDefaultProperties } from '../services/awsComponentRegistry';

function CanvasContainer() {
    const dispatch = useDispatch();

    const { activeTab, isLineMode, lineStart, ghostLine } = useSelector(state => state.uiState);
    const canvasComponents = useSelector(selectComponents);
    const connections = useSelector(state => state.connections);
    const draggingComponent = useSelector(selectDraggingComponent);

    const handleMouseDown = (type, e) => {
        if (!isLineMode && (type === 'ec2' || type === 's3')) {
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
                fill: type === 'ec2' ? 'orange' : 'green',
                opacity: 0.5,
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
            dispatch(setGhostLine({
                points: [
                    lineStart.x + lineStart.width / 2,
                    lineStart.y + lineStart.height / 2,
                    pointerPosition.x,
                    pointerPosition.y,
                ],
            }));
        }
    };

    const handleMouseUp = (e) => {
        if (!isLineMode && draggingComponent && (draggingComponent.type === 'ec2' || draggingComponent.type === 's3')) {
            const newComponent = {
                id: `${draggingComponent.type}-${Date.now()}`,
                x: draggingComponent.x,
                y: draggingComponent.y,
                width: 40,
                height: 40,
                fill: draggingComponent.fill,
                draggable: true,
                type: draggingComponent.type,
                ...getDefaultProperties(draggingComponent.type)
            };

            dispatch(addComponent(newComponent));
            dispatch(setDraggingComponent(null));
        }
    };

    const handleComponentClick = (comp, e) => {
        e.evt.preventDefault();
        if (isLineMode) {
            if (!lineStart) {
                dispatch(setLineStart(comp));
            } else if (lineStart.id !== comp.id) {
                dispatch(addConnection({
                    from: lineStart.id,
                    to: comp.id
                }));
                dispatch(setLineStart(null));
                dispatch(setGhostLine(null));
                dispatch(setLineMode(false));
            }
        } else {
            dispatch(setLineStart(comp));
        }
    };

    const handleDragMove = (e, compId) => {
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
            // Delete the component - will be handled by the reducer
            dispatch(updateComponentPosition({
                id: compId,
                delete: true
            }));
        }
    };

    const handleClearConnections = () => {
        dispatch(clearConnections());
    };

    return (
        <div style={{ position: 'relative' }}>
            <Stage
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
                    />
                    <Sidebar
                        handleMouseDown={handleMouseDown}
                        lineStart={lineStart}
                        handleClearConnections={handleClearConnections}
                    />
                </Layer>
            </Stage>
        </div>
    );
}

export default CanvasContainer;