// src/components/Canvas.js
import React, { useState } from 'react';
import { Rect, Line, Text, Group } from 'react-konva';
import AwsIcon from './AwsIcon';
import ConnectionLine from './ConnectionLine';
import { validateConnection } from '../services/connectionValidator';

function Canvas({
                    canvasComponents,
                    connections,
                    isLineMode,
                    lineStart,
                    ghostLine,
                    draggingComponent,
                    handleComponentClick,
                    handleDragMove,
                    handleDragEnd,
                    handleDeleteConnection
                }) {
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [hoveredComponent, setHoveredComponent] = useState(null);

    // Determine if a component is valid for connection when in line mode
    const isValidConnectionTarget = (component) => {
        if (!isLineMode || !lineStart || lineStart.id === component.id) {
            return false;
        }

        const validation = validateConnection(lineStart, component);
        return validation.valid;
    };

    return (
        <>
            {/* Canvas grid */}
            <Group>
                {/* Horizontal grid lines */}
                {Array.from({ length: 20 }, (_, i) => (
                    <Line
                        key={`h-${i}`}
                        points={[200, i * 20, 800, i * 20]}
                        stroke="#e0e0e0"
                        strokeWidth={1}
                    />
                ))}

                {/* Vertical grid lines */}
                {Array.from({ length: 30 }, (_, i) => (
                    <Line
                        key={`v-${i}`}
                        points={[200 + i * 20, 0, 200 + i * 20, 400]}
                        stroke="#e0e0e0"
                        strokeWidth={1}
                    />
                ))}
            </Group>

            {/* Canvas area */}
            <Rect x={200} y={0} width={600} height={400} fill="#F5F5F5" stroke="#cccccc" strokeWidth={1} />

            {/* Right sidebar area */}
            <Rect x={800} y={0} width={200} height={400} fill="white" stroke="gray" strokeWidth={1} />

            {/* Trash area */}
            <Rect x={800} y={0} width={200} height={200} fill="#ffcccc" stroke="red" strokeWidth={2} />
            <Text x={875} y={90} text="Trash" fontSize={16} fill="red" align="center" width={50} />

            {/* Connection lines */}
            {connections.map((conn) => {
                const fromComp = canvasComponents.find(c => c.id === conn.from);
                const toComp = canvasComponents.find(c => c.id === conn.to);
                if (fromComp && toComp) {
                    return (
                        <ConnectionLine
                            key={`${conn.from}-${conn.to}`}
                            connection={conn}
                            fromComponent={fromComp}
                            toComponent={toComp}
                            onDelete={handleDeleteConnection}
                            isSelected={selectedConnection === `${conn.from}-${conn.to}`}
                            setSelected={() => setSelectedConnection(`${conn.from}-${conn.to}`)}
                        />
                    );
                }
                return null;
            })}

            {/* Ghost line for when creating a connection */}
            {isLineMode && lineStart && ghostLine && (
                <Line
                    points={ghostLine.points}
                    stroke="#0066cc"
                    strokeWidth={2}
                    opacity={0.5}
                    dash={[5, 5]}
                />
            )}

            {/* Component icons */}
            {canvasComponents.map(comp => (
                <AwsIcon
                    key={comp.id}
                    component={comp}
                    onClick={(e) => handleComponentClick(comp, e)}
                    onDragMove={(e) => handleDragMove(e, comp.id)}
                    onDragEnd={(e) => handleDragEnd(e, comp.id)}
                    isSelected={lineStart && lineStart.id === comp.id}
                    isValidTarget={isValidConnectionTarget(comp)}
                    isHovered={hoveredComponent === comp.id}
                    onMouseEnter={() => setHoveredComponent(comp.id)}
                    onMouseLeave={() => setHoveredComponent(null)}
                />
            ))}

            {/* Dragging component preview */}
            {draggingComponent && (
                <Group
                    x={draggingComponent.x - draggingComponent.width / 2}
                    y={draggingComponent.y - draggingComponent.height / 2}
                    opacity={0.5}
                >
                    <Rect
                        width={draggingComponent.width}
                        height={draggingComponent.height}
                        fill={draggingComponent.color || draggingComponent.fill}
                        stroke="#333"
                        strokeWidth={1}
                        dash={[5, 5]}
                        cornerRadius={4}
                    />
                    <Text
                        text={draggingComponent.displayName || draggingComponent.type.toUpperCase()}
                        fontSize={10}
                        fill="#333"
                        width={draggingComponent.width * 1.5}
                        align="center"
                        x={-draggingComponent.width * 0.25}
                        y={draggingComponent.height + 5}
                    />
                </Group>
            )}

            {/* Connection Validation Helper Text */}
            {isLineMode && lineStart && (
                <Text
                    x={600}
                    y={10}
                    text="Select a valid target component to connect"
                    fontSize={12}
                    fill="#333"
                    align="center"
                    width={180}
                    padding={5}
                    background="#ffffcc"
                />
            )}
        </>
    );
}

export default Canvas;