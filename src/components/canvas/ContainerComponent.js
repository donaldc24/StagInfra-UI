import React, { useState } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import { getAwsServiceColor, getAwsServiceName } from '../../services/aws/awsIconLibrary';

const ContainerComponent = ({
                                component,
                                children,
                                isSelected,
                                isHighlighted,
                                onClick,
                                onDragStart,
                                onDragMove,
                                onDragEnd,
                                onResize,
                                showAzs = true,
                            }) => {
    const { id, type, x, y, width = 300, height = 200, name, cidr_block } = component;
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Get styling for container type
    const headerColor = getAwsServiceColor(type);
    const serviceName = getAwsServiceName(type);

    // Determine container style
    let fill = 'rgba(124, 58, 237, 0.1)';
    let dash = [];

    if (type === 'vpc') {
        fill = 'rgba(36, 136, 20, 0.1)';
        dash = [];
    } else if (type === 'subnet') {
        fill = 'rgba(52, 168, 83, 0.1)';
        dash = [10, 5];
    } else if (type === 'securityGroup') {
        fill = 'rgba(66, 133, 244, 0.1)';
        dash = [5, 5];
    }

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
        // Add visual feedback for dragging
        e.target.setAttrs({
            shadowOffset: {
                x: 3,
                y: 3
            },
            shadowBlur: 10,
            shadowOpacity: 0.2
        });

        // Call the parent handler
        if (onDragStart) {
            onDragStart(e, id);
        }
    };

    const handleDragMove = (e) => {
        // Call the parent handler
        if (onDragMove) {
            onDragMove(e, id);
        }
    };

    const handleDragEnd = (e) => {
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

        // Call the parent handler
        if (onDragEnd) {
            onDragEnd(e, id);
        }
    };

    // Handle resize drag events
    const handleResizeDragMove = (e, corner) => {
        e.cancelBubble = true;

        let newWidth = width;
        let newHeight = height;

        // Calculate new dimensions based on which handle is being dragged
        switch(corner) {
            case 'se': // southeast
                newWidth = Math.max(100, width + e.target.x());
                newHeight = Math.max(100, height + e.target.y());
                break;
            case 'sw': // southwest
                newWidth = Math.max(100, width - e.target.x());
                newHeight = Math.max(100, height + e.target.y());
                break;
            case 'ne': // northeast
                newWidth = Math.max(100, width + e.target.x());
                newHeight = Math.max(100, height - e.target.y());
                break;
            case 'nw': // northwest
                newWidth = Math.max(100, width - e.target.x());
                newHeight = Math.max(100, height - e.target.y());
                break;
            default:
                break;
        }

        // Reset handle position
        e.target.position({ x: 0, y: 0 });

        // Call parent resize handler
        if (onResize) {
            onResize(id, newWidth, newHeight);
        }
    };

    // Generate a label with component type info and count of contained items
    const containerLabel = () => {
        const childCount = React.Children.count(children);
        const typeName = serviceName || type.toUpperCase();
        const nameLabel = name || `${typeName}-${id.slice(-4)}`;

        return nameLabel + (childCount > 0 ? ` (${childCount})` : '');
    };

    // Add resize handles if not collapsed and selected
    const resizeHandles = (!isCollapsed && isSelected) ? (
        <>
            {/* Southeast (bottom-right) handle */}
            <Group
                x={width}
                y={height}
                draggable
                onDragMove={(e) => handleResizeDragMove(e, 'se')}
            >
                <Rect
                    x={-4}
                    y={-4}
                    width={8}
                    height={8}
                    fill="white"
                    stroke={strokeColor}
                    strokeWidth={1}
                    cornerRadius={1}
                />
            </Group>

            {/* Southwest (bottom-left) handle */}
            <Group
                x={0}
                y={height}
                draggable
                onDragMove={(e) => handleResizeDragMove(e, 'sw')}
            >
                <Rect
                    x={-4}
                    y={-4}
                    width={8}
                    height={8}
                    fill="white"
                    stroke={strokeColor}
                    strokeWidth={1}
                    cornerRadius={1}
                />
            </Group>

            {/* Northeast (top-right) handle */}
            <Group
                x={width}
                y={0}
                draggable
                onDragMove={(e) => handleResizeDragMove(e, 'ne')}
            >
                <Rect
                    x={-4}
                    y={-4}
                    width={8}
                    height={8}
                    fill="white"
                    stroke={strokeColor}
                    strokeWidth={1}
                    cornerRadius={1}
                />
            </Group>

            {/* Northwest (top-left) handle */}
            <Group
                x={0}
                y={0}
                draggable
                onDragMove={(e) => handleResizeDragMove(e, 'nw')}
            >
                <Rect
                    x={-4}
                    y={-4}
                    width={8}
                    height={8}
                    fill="white"
                    stroke={strokeColor}
                    strokeWidth={1}
                    cornerRadius={1}
                />
            </Group>
        </>
    ) : null;

    // Render AZ guides if this is a VPC and AZs are enabled
    const availabilityZones = [];
    if (type === 'vpc' && showAzs && !isCollapsed) {
        const numAzs = 3; // Default to 3 AZs
        const azWidth = width / numAzs;

        for (let i = 1; i < numAzs; i++) {
            availabilityZones.push(
                <Line
                    key={`az-line-${i}`}
                    points={[i * azWidth, 30, i * azWidth, height]}
                    stroke="#9CA3AF"
                    strokeWidth={1}
                    dash={[6, 3]}
                />
            );

            availabilityZones.push(
                <Text
                    key={`az-text-${i}`}
                    x={(i - 0.5) * azWidth - 15}
                    y={height - 20}
                    text={`AZ-${String.fromCharCode(96 + i)}`}
                    fontSize={10}
                    fill="#6B7280"
                    rotation={-90}
                />
            );
        }

        // Add text for the first AZ
        availabilityZones.push(
            <Text
                key="az-text-0"
                x={azWidth * 0.5 - 15}
                y={height - 20}
                text="AZ-a"
                fontSize={10}
                fill="#6B7280"
                rotation={-90}
            />
        );
    }

    return (
        <Group
            x={x}
            y={y}
            width={width}
            height={isCollapsed ? 30 : height}
            draggable
            componentId={id} // Used for tooltip identification
            onClick={(e) => onClick && onClick(e, component)}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {/* Container background */}
            <Rect
                width={width}
                height={isCollapsed ? 30 : height}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                dash={dash}
                cornerRadius={type === 'vpc' ? 8 : type === 'securityGroup' ? 14 : 4}
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={isSelected ? 6 : 0}
                shadowOffset={{ x: 0, y: 2 }}
                shadowOpacity={0.3}
            />

            {/* Header section */}
            <Rect
                width={width}
                height={30}
                fill={headerColor}
                cornerRadius={[
                    type === 'vpc' ? 8 : type === 'securityGroup' ? 14 : 4,
                    type === 'vpc' ? 8 : type === 'securityGroup' ? 14 : 4,
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
            {!isCollapsed && cidr_block && (
                <Text
                    x={10}
                    y={35}
                    text={`CIDR: ${cidr_block}`}
                    fontSize={12}
                    fill="#4B5563"
                />
            )}

            {/* Availability Zone guides */}
            {!isCollapsed && availabilityZones}

            {/* Only render children if not collapsed */}
            {!isCollapsed && children}

            {/* Resize handles */}
            {resizeHandles}

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