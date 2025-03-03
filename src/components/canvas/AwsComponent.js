// src/components/canvas/AwsComponent.js
import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { getComponentMetadata } from '../../services/awsComponentRegistry';

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

    return (
        <Group
            x={x}
            y={y}
            width={width}
            height={height}
            draggable
            onClick={onClick}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            className="aws-component"
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
                width={width}
                height={height}
                align="center"
                verticalAlign="middle"
            />

            {/* Component name */}
            <Text
                y={height + 5}
                width={width}
                text={name || metadata.displayName || type}
                fontSize={12}
                fill="#374151"
                align="center"
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