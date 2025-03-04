// src/components/canvas/ConnectionLine.js
import React from 'react';
import { Group, Line, Circle, Text } from 'react-konva';
import { useSelector } from 'react-redux';

const ConnectionLine = ({
                            connection,
                            sourceComponent,
                            targetComponent,
                            points,
                            isSelected,
                            isGhost,
                            onClick,
                            onDelete
                        }) => {
    // Get all components to find containers
    const allComponents = useSelector(state => state.components.list);

    // If we have explicit points, use those (for ghost lines)
    let linePoints = points;

    // Otherwise calculate from source and target components with container adjustment
    if (!linePoints && sourceComponent && targetComponent) {
        // Helper to get absolute position considering container nesting
        const getAbsolutePosition = (component) => {
            let x = component.x;
            let y = component.y;
            let currentId = component.containerId;

            // Traverse up the container hierarchy
            while (currentId) {
                const container = allComponents.find(c => c.id === currentId);
                if (container) {
                    x += container.x;
                    y += container.y;
                    currentId = container.containerId;
                } else {
                    break;
                }
            }

            return { x, y };
        };

        // Get absolute positions
        const sourcePos = getAbsolutePosition(sourceComponent);
        const targetPos = getAbsolutePosition(targetComponent);

        const sourceX = sourcePos.x + (sourceComponent.width || 40) / 2;
        const sourceY = sourcePos.y + (sourceComponent.height || 40) / 2;
        const targetX = targetPos.x + (targetComponent.width || 40) / 2;
        const targetY = targetPos.y + (targetComponent.height || 40) / 2;

        linePoints = [sourceX, sourceY, targetX, targetY];
    }

    // If we don't have points, don't render
    if (!linePoints) return null;

    // Calculate midpoint for the delete button
    const midX = (linePoints[0] + linePoints[2]) / 2;
    const midY = (linePoints[1] + linePoints[3]) / 2;

    // Calculate the angle for the arrow
    const angle = Math.atan2(
        linePoints[3] - linePoints[1],
        linePoints[2] - linePoints[0]
    );

    // Calculate arrow points
    const arrowLength = 10;
    const arrowWidth = 6;

    const arrowPoints = [
        linePoints[2] - arrowLength * Math.cos(angle) - arrowWidth * Math.cos(angle - Math.PI/2),
        linePoints[3] - arrowLength * Math.sin(angle) - arrowWidth * Math.sin(angle - Math.PI/2),
        linePoints[2],
        linePoints[3],
        linePoints[2] - arrowLength * Math.cos(angle) - arrowWidth * Math.cos(angle + Math.PI/2),
        linePoints[3] - arrowLength * Math.sin(angle) - arrowWidth * Math.sin(angle + Math.PI/2)
    ];

    return (
        <Group onClick={onClick}>
            {/* Main connection line */}
            <Line
                points={linePoints}
                stroke={isGhost ? "#3B82F6" : (isSelected ? "#3B82F6" : "#6B7280")}
                strokeWidth={isSelected ? 2 : 1}
                dash={isGhost ? [5, 5] : undefined}
                opacity={isGhost ? 0.6 : 1}
            />

            {/* Arrow head */}
            {!isGhost && (
                <Line
                    points={arrowPoints}
                    closed
                    fill={isSelected ? "#3B82F6" : "#6B7280"}
                    stroke={isSelected ? "#3B82F6" : "#6B7280"}
                />
            )}

            {/* Delete button (only visible when selected) */}
            {isSelected && !isGhost && (
                <Group
                    x={midX}
                    y={midY}
                    onClick={(e) => {
                        e.cancelBubble = true; // Stop event propagation
                        onDelete && onDelete(connection.id);
                    }}
                >
                    <Circle
                        radius={8}
                        fill="#EF4444"
                        stroke="white"
                        strokeWidth={1}
                    />
                    <Text
                        x={-4}
                        y={-5}
                        text="×"
                        fontSize={12}
                        fill="white"
                    />
                </Group>
            )}
        </Group>
    );
};

export default React.memo(ConnectionLine);