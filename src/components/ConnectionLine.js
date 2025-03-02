// src/components/ConnectionLine.js
import React, { useState } from 'react';
import { Line, Circle, Text, Group, Rect } from 'react-konva';
import { getConnectionDescription } from '../services/connectionValidator';

const ConnectionLine = ({
                            connection,
                            fromComponent,
                            toComponent,
                            onDelete,
                            isSelected,
                            setSelected
                        }) => {
    const [hovered, setHovered] = useState(false);

    if (!fromComponent || !toComponent) {
        return null;
    }

    // Calculate line points
    const fromX = fromComponent.x + fromComponent.width / 2;
    const fromY = fromComponent.y + fromComponent.height / 2;
    const toX = toComponent.x + toComponent.width / 2;
    const toY = toComponent.y + toComponent.height / 2;

    // Calculate the midpoint for the label
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    // Calculate the angle for the arrow
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Calculate the arrow points
    const arrowLength = 10;
    const arrowWidth = 6;

    const arrowPoints = [
        toX - arrowLength * Math.cos(angle) - arrowWidth * Math.cos(angle - Math.PI/2),
        toY - arrowLength * Math.sin(angle) - arrowWidth * Math.sin(angle - Math.PI/2),
        toX,
        toY,
        toX - arrowLength * Math.cos(angle) - arrowWidth * Math.cos(angle + Math.PI/2),
        toY - arrowLength * Math.sin(angle) - arrowWidth * Math.sin(angle + Math.PI/2)
    ];

    // Get the connection description
    const description = getConnectionDescription(fromComponent, toComponent);

    return (
        <Group
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => setSelected(connection.id)}
        >
            {/* Connection line */}
            <Line
                points={[fromX, fromY, toX, toY]}
                stroke={isSelected ? '#0066cc' : (hovered ? '#666666' : '#999999')}
                strokeWidth={isSelected ? 2 : 1}
                dash={hovered || isSelected ? undefined : [5, 2]}
            />

            {/* Arrow head */}
            <Line
                points={arrowPoints}
                closed
                fill={isSelected ? '#0066cc' : (hovered ? '#666666' : '#999999')}
                stroke={isSelected ? '#0066cc' : (hovered ? '#666666' : '#999999')}
            />

            {/* Connection description label */}
            {(hovered || isSelected) && description && (
                <Group>
                    <Rect
                        x={midX - 50}
                        y={midY - 10}
                        width={100}
                        height={20}
                        fill="white"
                        opacity={0.7}
                    />

                    <Text
                        x={midX - 50}
                        y={midY - 10}
                        width={100}
                        text={description}
                        fontSize={10}
                        fill="#333333"
                        align="center"
                    />
                </Group>
            )}

            {/* Delete button (shown on hover or selection) */}
            {(hovered || isSelected) && (
                <Group
                    x={midX}
                    y={midY}
                    onClick={(e) => {
                        e.cancelBubble = true; // Stop propagation
                        onDelete(connection.id);
                    }}
                >
                    <Circle
                        radius={8}
                        fill="red"
                    />
                    <Text
                        x={-4}
                        y={-5}
                        text="×"
                        fontSize={12}
                        fill="white"
                        listening={false}
                    />
                </Group>
            )}
        </Group>
    );
};

export default ConnectionLine;