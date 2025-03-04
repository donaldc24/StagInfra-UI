// src/components/canvas/AwsComponent.js
import React from 'react';
import { Group, Rect, Text } from 'react-konva';

const AwsComponent = ({
                          component,
                          isSelected,
                          isConnectable,
                          onClick,
                          onDragEnd
                      }) => {
    const { id, type, x, y, width = 40, height = 40, name } = component;

    // Different colors based on component type
    const getColor = () => {
        switch (type) {
            case 'ec2': return '#FF9900';
            case 's3': return '#3F8624';
            case 'lambda': return '#FF9900';
            case 'dynamodb': return '#3B48CC';
            case 'rds': return '#3B48CC';
            case 'vpc': return '#248814';
            case 'subnet': return '#34A853';
            case 'securityGroup': return '#4285F4';
            case 'loadBalancer': return '#248814';
            case 'ebs': return '#16a34a';
            default: return '#6B7280';
        }
    };

    // Stroke style based on selection state
    const strokeColor = isSelected ? '#3B82F6' : '#333333';
    const strokeWidth = isSelected ? 2 : 1;

    // Display name - use either provided name or type + id suffix
    const displayName = name || `${type.toUpperCase()}-${id.slice(-4)}`;

    // Handle drag start
    const handleDragStart = (e) => {
        console.log('Drag start:', id);
        e.target.setAttrs({
            shadowOffset: { x: 3, y: 3 },
            shadowBlur: 6,
            scaleX: 1.02,
            scaleY: 1.02
        });
    };

    // Handle drag end
    const handleDragEnd = (e) => {
        console.log('Drag end:', id, 'at position:', e.target.x(), e.target.y());
        e.target.setAttrs({
            shadowOffset: { x: 0, y: 0 },
            shadowBlur: 0,
            scaleX: 1,
            scaleY: 1
        });

        if (onDragEnd) {
            onDragEnd(e, id);
        }
    };

    return (
        <Group
            x={x}
            y={y}
            width={width}
            height={height}
            draggable
            onClick={(e) => onClick && onClick(e, component)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* Main component shape */}
            <Rect
                width={width}
                height={height}
                fill={getColor()}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                cornerRadius={4}
                shadowBlur={isSelected ? 6 : 0}
                shadowColor="rgba(0,0,0,0.3)"
            />

            {/* Component type label */}
            <Text
                text={type.substring(0, 2).toUpperCase()}
                width={width}
                height={height}
                fontSize={16}
                fill="white"
                fontStyle="bold"
                align="center"
                verticalAlign="middle"
            />

            {/* Component name below */}
            <Text
                text={displayName}
                width={width}
                y={height + 5}
                fontSize={12}
                fill="#374151"
                align="center"
            />
        </Group>
    );
};

export default React.memo(AwsComponent);