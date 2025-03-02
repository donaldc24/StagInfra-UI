import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { getComponentMetadata } from '../services/awsComponentRegistry';

const AwsIcon = ({ component, onClick, onDragMove, onDragEnd, isSelected }) => {
    const { type, x, y, width, height, id, name } = component;
    const metadata = getComponentMetadata(type) || {};

    // In a real implementation, you would use useImage hook to load
    // actual AWS icons from the metadata.icon path
    // const [image] = useImage(metadata?.icon || '/icons/placeholder.svg');

    // For simplicity, using colored rectangles until you have actual AWS icons
    return (
        <Group
            x={x}
            y={y}
            width={width}
            height={height}
            draggable={true}
            onClick={onClick}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
        >
            {/* Main icon - would be replaced with Image when you have actual icons */}
            <Rect
                width={width}
                height={height}
                fill={metadata.color || component.fill}
                stroke={isSelected ? '#0066cc' : '#333'}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={4}
            />

            {/* Component label */}
            <Text
                text={name || metadata.displayName || type.toUpperCase()}
                fontSize={10}
                fill="#333"
                width={width * 1.5}
                align="center"
                x={-width * 0.25}
                y={height + 5}
            />
        </Group>
    );
};

export default AwsIcon;