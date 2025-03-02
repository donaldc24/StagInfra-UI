// src/components/AwsIcon.js
import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { getComponentMetadata } from '../services/awsComponentRegistry';

const AwsIcon = ({
                     component,
                     onClick,
                     onDragMove,
                     onDragEnd,
                     isSelected,
                     isValidTarget,
                     isHovered,
                     onMouseEnter,
                     onMouseLeave
                 }) => {
    const { type, x, y, width, height, id, name } = component;
    const metadata = getComponentMetadata(type) || {};

    // Determine border color based on state
    let strokeColor = '#333';
    let strokeWidth = 1;

    if (isSelected) {
        strokeColor = '#0066cc';
        strokeWidth = 2;
    } else if (isValidTarget) {
        strokeColor = '#00cc00';
        strokeWidth = 2;
    } else if (isHovered) {
        strokeColor = '#666666';
        strokeWidth = 1.5;
    }

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
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Main icon - would be replaced with Image when you have actual icons */}
            <Rect
                width={width}
                height={height}
                fill={metadata.color || component.fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                cornerRadius={4}
            />

            {/* Category indicator */}
            <Circle
                x={width - 5}
                y={5}
                radius={3}
                fill={getCategoryColor(metadata.category)}
            />

            {/* Service initials or icon */}
            <Text
                text={type.substring(0, 2).toUpperCase()}
                fontSize={14}
                fontStyle="bold"
                fill="white"
                align="center"
                verticalAlign="middle"
                width={width}
                height={height}
                listening={false}
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
                listening={false}
            />

            {/* Show properties indicator if component has custom properties */}
            {hasCustomProperties(component, metadata) && (
                <Circle
                    x={5}
                    y={5}
                    radius={3}
                    fill="#0066cc"
                />
            )}
        </Group>
    );
};

// Helper function to determine category color
const getCategoryColor = (category) => {
    switch (category) {
        case 'compute':
            return '#FF9900'; // Orange
        case 'storage':
            return '#3F8624'; // Green
        case 'database':
            return '#3B48CC'; // Blue
        case 'networking':
            return '#248814'; // Dark green
        default:
            return '#999999'; // Grey
    }
};

// Helper function to check if component has custom properties set
const hasCustomProperties = (component, metadata) => {
    if (!metadata || !metadata.defaultProperties) {
        return false;
    }

    // Check if any properties differ from defaults
    return Object.keys(metadata.defaultProperties).some(key => {
        return component[key] !== undefined &&
            component[key] !== metadata.defaultProperties[key];
    });
};

export default AwsIcon;