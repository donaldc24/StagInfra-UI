// src/components/ContainerComponent.js
import React, { useState } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { getComponentMetadata } from '../services/awsComponentRegistry';

/**
 * ContainerComponent renders a container (VPC or Subnet) that can hold other components
 * It provides visual cues for the containment relationship
 */
const ContainerComponent = ({
                                component,
                                children,
                                onClick,
                                onDragMove,
                                onDragEnd,
                                isSelected,
                                isHovered,
                                onMouseEnter,
                                onMouseLeave,
                            }) => {
    const { id, type, x, y, name } = component;
    const [isExpanded, setIsExpanded] = useState(true);
    const metadata = getComponentMetadata(type) || {};

    // Calculate dimensions based on contained components or use minimum size
    const minWidth = 200;
    const minHeight = 150;
    const containerWidth = Math.max(minWidth, component.width || minWidth);
    const containerHeight = Math.max(minHeight, component.height || minHeight);

    // Determine border color based on state
    let strokeColor = '#333';
    let strokeWidth = 1;

    if (isSelected) {
        strokeColor = '#0066cc';
        strokeWidth = 2;
    } else if (isHovered) {
        strokeColor = '#666666';
        strokeWidth = 1.5;
    }

    // Different styling for VPC vs Subnet
    const containerStyle = {
        vpc: {
            fill: 'rgba(240, 240, 250, 0.5)',
            dashEnabled: false,
        },
        subnet: {
            fill: 'rgba(220, 240, 220, 0.5)',
            dashEnabled: true,
        }
    };

    const style = containerStyle[type] || containerStyle.vpc;

    const handleToggleExpand = (e) => {
        e.cancelBubble = true; // Stop propagation
        setIsExpanded(!isExpanded);
    };

    // Get display name based on component type
    const displayName = name || metadata.displayName || `${type.toUpperCase()}-${id.slice(-4)}`;

    // Get CIDR block if available
    const cidrBlock = component.cidr_block || (type === 'vpc' ? '10.0.0.0/16' : '10.0.1.0/24');

    return (
        <Group
            x={x}
            y={y}
            draggable
            onClick={onClick}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Container background */}
            <Rect
                width={containerWidth}
                height={containerHeight}
                fill={style.fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                dash={style.dashEnabled ? [10, 5] : undefined}
                cornerRadius={type === 'vpc' ? 10 : 5}
            />

            {/* Header section */}
            <Rect
                y={0}
                width={containerWidth}
                height={30}
                fill={metadata.color || '#6aa84f'}
                cornerRadius={[type === 'vpc' ? 10 : 5, type === 'vpc' ? 10 : 5, 0, 0]}
            />

            {/* Component title */}
            <Text
                x={10}
                y={7}
                text={displayName}
                fontSize={14}
                fontStyle="bold"
                fill="white"
            />

            {/* CIDR block display */}
            <Text
                x={10}
                y={35}
                text={`CIDR: ${cidrBlock}`}
                fontSize={12}
                fill="#333"
            />

            {/* Expand/collapse button */}
            <Group x={containerWidth - 30} y={5} onClick={handleToggleExpand}>
                <Rect
                    width={20}
                    height={20}
                    fill="rgba(255, 255, 255, 0.3)"
                    cornerRadius={3}
                />
                <Text
                    x={5}
                    y={3}
                    text={isExpanded ? "-" : "+"}
                    fontSize={14}
                    fontStyle="bold"
                    fill="white"
                />
            </Group>

            {/* Render children only if expanded */}
            {isExpanded && children}

            {/* If collapsed, show a count of contained resources */}
            {!isExpanded && (
                <Text
                    x={containerWidth / 2 - 50}
                    y={containerHeight / 2 - 10}
                    width={100}
                    text={`Contains ${React.Children.count(children)} resources`}
                    fontSize={12}
                    align="center"
                    fill="#666"
                />
            )}
        </Group>
    );
};

export default ContainerComponent;