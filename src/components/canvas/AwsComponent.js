// src/components/canvas/AwsComponent.js
import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { getComponentMetadata } from '../../services/hierarchicalAwsComponentRegistry';

const AwsComponent = ({
                          component,
                          isSelected,
                          isConnectable,
                          isValidTarget,
                          onClick,
                          onDragMove,
                          onDragEnd
                      }) => {
    const { id, type, x, y, width = 40, height = 40, name } = component;
    const metadata = getComponentMetadata(type) || {};

    // Determine colors based on state
    let fillColor = metadata.color || '#6B7280';
    let strokeColor = '#333333';
    let strokeWidth = 1;

    if (isSelected) {
        strokeColor = '#3B82F6';
        strokeWidth = 2;
    } else if (isValidTarget) {
        strokeColor = '#10B981';
        strokeWidth = 2;
    }

    // Helper function for the debug panel
    const updateDragDebug = (message) => {
        const debugContent = document.getElementById('drag-debug-content');
        if (debugContent) {
            debugContent.innerHTML = message;
        }
    };

    const handleDragStart = (e) => {
        console.log('Component drag start:', id);

        // Store the original position
        e.target.originalX = x;
        e.target.originalY = y;

        // Add visual feedback
        e.target.to({
            duration: 0.1,
            shadowBlur: 10,
            scaleX: 1.05,
            scaleY: 1.05,
        });
    };

    const handleDragEnd = (e) => {
        console.log('Component drag end:', id);

        // Reset appearance
        e.target.to({
            duration: 0.1,
            shadowBlur: 0,
            scaleX: 1,
            scaleY: 1,
        });

        // Calculate the new position
        const newX = e.target.x();
        const newY = e.target.y();

        // Directly update the position
        if (onDragEnd) {
            onDragEnd(e, id, { x: newX, y: newY });
        }
    };

    const handleDragMove = (e) => {
        console.log('Component drag move:', id, 'to:', e.target.x(), e.target.y());
        updateDragDebug(`Moving ${id} to ${e.target.x()}, ${e.target.y()}`);

        // IMPORTANT: Make sure we prevent default and stop propagation
        e.cancelBubble = true;

        if (onDragMove) {
            onDragMove(e, id);
        }
    };

    return (
        <Group
            x={x}
            y={y}
            width={width}
            height={height}
            draggable={true}
            onClick={(e) => {
                console.log(`Clicked component ${id} at (${x}, ${y})`);
                // IMPORTANT: Make sure we prevent default and stop propagation
                e.cancelBubble = true;
                if (onClick) onClick(e, component);
            }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {/* Main shape */}
            <Rect
                width={width}
                height={height}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                cornerRadius={4}
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={isSelected ? 6 : 0}
                shadowOffset={{ x: 0, y: 2 }}
                shadowOpacity={0.3}
            />

            {/* Component type abbreviation */}
            <Text
                text={type.substring(0, 2).toUpperCase()}
                fontSize={16}
                fontStyle="bold"
                fill="white"
                align="center"
                verticalAlign="middle"
                width={width}
                height={height}
            />

            // For the component name below, either remove it or use:
            <Text
                y={height + 5}
                text={name || metadata.displayName || type}
                fontSize={12}
                fill="#374151"
                align="center"
                width={width}
            />

            {/* Connection indicator dot */}
            {isConnectable && (
                <Circle
                    x={width}
                    y={height / 2}
                    radius={4}
                    fill={isSelected ? "#3B82F6" : "#9CA3AF"}
                />
            )}
        </Group>
    );
};

export default React.memo(AwsComponent);