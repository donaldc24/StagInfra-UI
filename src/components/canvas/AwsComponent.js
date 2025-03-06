// src/components/canvas/AwsComponent.js
import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import { AwsIcon, getAwsServiceName, getAwsServiceColor } from '../../services/aws/awsIconLibrary';
import Tooltip from '../shared/Tooltip';

const AwsComponent = ({
                          component,
                          isSelected,
                          isConnectable,
                          onClick,
                          onDragStart,
                          onDragMove,
                          onDragEnd
                      }) => {
    const { id, type, x, y, width = 40, height = 40, name, containerId } = component;

    // Get service-specific styling
    const serviceColor = getAwsServiceColor(type);
    const serviceName = getAwsServiceName(type);

    // Display name - use either provided name or type + id suffix
    const displayName = name || `${type.toUpperCase()}-${id.slice(-4)}`;

    // Stroke style based on selection state
    const strokeColor = isSelected ? '#3B82F6' : '#333333';
    const strokeWidth = isSelected ? 2 : 1;

    // Handle drag start
    const handleDragStart = (e) => {
        e.target.setAttrs({
            shadowOffset: { x: 3, y: 3 },
            shadowBlur: 6,
            scaleX: 1.02,
            scaleY: 1.02
        });

        if (onDragStart) {
            onDragStart(e, id);
        }
    };

    // Handle drag move
    const handleDragMove = (e) => {
        if (onDragMove) {
            onDragMove(e, id);
        }
    };

    // Handle drag end
    const handleDragEnd = (e) => {
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

    // Add special styling if component is in a container
    const containerIndicator = containerId ? (
        <Rect
            x={width - 6}
            y={-6}
            width={12}
            height={12}
            cornerRadius={6}
            fill="#4285F4"
            stroke="white"
            strokeWidth={1}
        />
    ) : null;

    // Using Konva for canvas rendering
    return (
        <Group
            x={x}
            y={y}
            width={width}
            height={height}
            draggable
            onClick={(e) => onClick && onClick(e, component)}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {/* Component background */}
            <Rect
                width={width}
                height={height}
                fill={serviceColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                cornerRadius={4}
                shadowBlur={isSelected ? 6 : 0}
                shadowColor="rgba(0,0,0,0.3)"
            />

            {/* AWS Icon representation - for Konva, we'll use a placeholder that resembles the icon */}
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

            {/* Container indicator (if in a container) */}
            {containerIndicator}

            {/* Component name below */}
            <Text
                text={displayName}
                width={width}
                y={height + 5}
                fontSize={12}
                fill="#374151"
                align="center"
            />

            {/* We can't directly use the Tooltip component with Konva,
          but the canvas can implement tooltips separately */}
        </Group>
    );
};

// Create a DOM version of the component for sidebar/property panel
export const AwsComponentDom = ({ type, name, id, size = 'md' }) => {
    const serviceColor = getAwsServiceColor(type);
    const serviceName = getAwsServiceName(type);
    const displayName = name || `${type.toUpperCase()}-${id ? id.slice(-4) : ''}`;

    // Get category class
    let categoryClass = 'aws-compute';
    if (['s3', 'ebs'].includes(type)) categoryClass = 'aws-storage';
    if (['rds', 'dynamodb'].includes(type)) categoryClass = 'aws-database';
    if (['vpc', 'subnet', 'securityGroup', 'loadBalancer', 'internetGateway', 'natGateway', 'routeTable', 'networkACL'].includes(type)) categoryClass = 'aws-networking';

    return (
        <Tooltip content={serviceName}>
            <div className={`aws-component aws-component-${size}`}>
                <div className={`aws-component-icon ${categoryClass}`}>
                    <AwsIcon type={type} color="white" size={size === 'sm' ? 24 : size === 'md' ? 32 : 48} />
                </div>
                <div className="aws-component-label">{displayName}</div>
            </div>
        </Tooltip>
    );
};

export default React.memo(AwsComponent);