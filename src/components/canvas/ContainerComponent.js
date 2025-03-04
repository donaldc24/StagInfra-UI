// src/components/canvas/ContainerComponent.js
import React, { useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import { getComponentMetadata } from '../../services/hierarchicalAwsComponentRegistry';

const ContainerComponent = ({
                                component,
                                children,
                                isSelected,
                                isHighlighted,
                                onClick,
                                onDragMove,
                                onDragEnd
                            }) => {
    const { id, type, x, y, width = 300, height = 200, name } = component;
    const [isCollapsed, setIsCollapsed] = useState(false);
    const metadata = getComponentMetadata(type) || {};

    // Styling based on container type
    const style = {
        vpc: {
            fill: 'rgba(124, 58, 237, 0.1)',
            headerFill: '#7C3AED',
            dash: []
        },
        subnet: {
            fill: 'rgba(99, 102, 241, 0.1)',
            headerFill: '#6366F1',
            dash: [10, 5]
        }
    }[type] || {
        fill: 'rgba(107, 114, 128, 0.1)',
        headerFill: '#6B7280',
        dash: []
    };

    // Border styles based on state
    let strokeColor = '#333333';
    let strokeWidth = 1;

    if (isSelected) {
        strokeColor = '#3B82F6';
        strokeWidth = 2;
    } else if (isHighlighted) {
        strokeColor = '#10B981';
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

    // Generate a label with component type info and count of contained items
    const containerLabel = () => {
        const childCount = React.Children.count(children);
        const typeName = metadata.displayName || type.toUpperCase();
        const nameLabel = name || `${typeName}-${id.slice(-4)}`;

        return nameLabel + (childCount > 0 ? ` (${childCount})` : '');
    };

    // Special styling for CIDR block display
    const cidrLabel = component.cidr_block ? `CIDR: ${component.cidr_block}` : '';

    return (
        <Group
            x={x}
            y={y}
            width={width}
            height={isCollapsed ? 30 : height}
            draggable
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
                text={containerLabel()}
                fontSize={14}
                fontStyle="bold"
                fill="white"
                width={width - 40}
                ellipsis
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

            {/* CIDR block display */}
            {!isCollapsed && cidrLabel && (
                <Text
                    x={10}
                    y={35}
                    text={cidrLabel}
                    fontSize={12}
                    fill="#4B5563"
                />
            )}

            {/* Only render children if not collapsed */}
            {!isCollapsed && children}

            {/* Show placeholder when no components are in container */}
            {!isCollapsed && React.Children.count(children) === 0 && (
                <Text
                    x={width / 2 - 60}
                    y={height / 2 - 10}
                    text="Drop components here"
                    fontSize={12}
                    fill="#9CA3AF"
                    fontStyle="italic"
                />
            )}

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