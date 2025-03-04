// src/components/canvas/ContainerComponent.js
import React, { useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { getComponentMetadata } from '../../services/hierarchicalAwsComponentRegistry';

const ContainerComponent = ({
                                component,
                                children,
                                isSelected,
                                onClick,
                                onDragMove,
                                onDragEnd
                            }) => {
    const { id, type, x, y, width = 200, height = 150, name } = component;
    const [isCollapsed, setIsCollapsed] = useState(false);
    const metadata = getComponentMetadata(type) || {};

    // Styling based on container type
    const style = {
        vpc: {
            fill: 'rgba(124, 58, 237, 0.05)',
            headerFill: '#7C3AED',
            dash: []
        },
        subnet: {
            fill: 'rgba(99, 102, 241, 0.05)',
            headerFill: '#6366F1',
            dash: [10, 5]
        }
    }[type] || {
        fill: 'rgba(107, 114, 128, 0.05)',
        headerFill: '#6B7280',
        dash: []
    };

    // Border styles based on state
    let strokeColor = '#333333';
    let strokeWidth = 1;

    if (isSelected) {
        strokeColor = '#3B82F6';
        strokeWidth = 2;
    }

    const handleToggleCollapse = (e) => {
        e.cancelBubble = true; // Stop propagation
        setIsCollapsed(prev => !prev);
    };

    const handleDragStart = (e) => {
        console.log('Container drag start:', id);
        // Add visual feedback for dragging
        e.target.setAttrs({
            shadowOffset: {
                x: 3,
                y: 3
            },
            shadowBlur: 10,
            shadowOpacity: 0.2
        });
    };

    const handleDragMove = (e) => {
        console.log('Container drag move:', id);
        if (onDragMove) {
            onDragMove(e, id);
        }
    };

    const handleDragEnd = (e) => {
        console.log('Container drag end:', id);
        // Reset appearance
        e.target.to({
            duration: 0.1,
            shadowOffset: {
                x: 0,
                y: 0
            },
            shadowBlur: 0,
            shadowOpacity: 0
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
            height={isCollapsed ? 30 : height}
            draggable={true}
            onClick={(e) => onClick && onClick(e, component)}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {/* Container background */}
            <Rect
                width={width}
                height={isCollapsed ? 30 : height}
                fill={style.fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                dash={style.dash}
                cornerRadius={type === 'vpc' ? 8 : 4}
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={isSelected ? 6 : 0}
                shadowOffset={{ x: 0, y: 2 }}
                shadowOpacity={0.3}
            />

            {/* Header section */}
            <Rect
                width={width}
                height={30}
                fill={style.headerFill}
                cornerRadius={[
                    type === 'vpc' ? 8 : 4,
                    type === 'vpc' ? 8 : 4,
                    0,
                    0
                ]}
            />

            {/* Title */}
            <Text
                x={10}
                y={7}
                text={name || metadata.displayName || type}
                fontSize={14}
                fontStyle="bold"
                fill="white"
            />

            {/* Collapse/expand button */}
            <Group
                x={width - 30}
                y={5}
                onClick={handleToggleCollapse}
            >
                <Rect
                    width={20}
                    height={20}
                    fill="rgba(255, 255, 255, 0.2)"
                    cornerRadius={3}
                />
                <Text
                    x={6}
                    y={2}
                    text={isCollapsed ? "+" : "-"}
                    fontSize={14}
                    fontStyle="bold"
                    fill="white"
                />
            </Group>

            {/* Only render children if not collapsed */}
            {!isCollapsed && children}

            {/* Show count when collapsed */}
            {isCollapsed && React.Children.count(children) > 0 && (
                <Text
                    x={10}
                    y={35}
                    text={`Contains ${React.Children.count(children)} items`}
                    fontSize={12}
                    fill="#6B7280"
                />
            )}
        </Group>
    );
};

export default React.memo(ContainerComponent);