// src/components/canvas/ConnectionLine.js
import React from 'react';
import { Group, Line, Circle, Text, Arrow } from 'react-konva';
import { useSelector } from 'react-redux';
import { getAwsServiceColor } from '../../services/aws/awsIconLibrary';

const ConnectionLine = ({
                            connection,
                            sourceComponent,
                            targetComponent,
                            points,
                            isSelected,
                            isGhost,
                            connectionType = 'default',
                            onClick,
                            onDelete
                        }) => {
    // Get all components to find containers
    const allComponents = useSelector(state => state.components.list);

    // If we have explicit points, use those (for ghost lines)
    let linePoints = points;

    // Otherwise calculate from source and target components with container adjustment
    if (!linePoints && sourceComponent && targetComponent) {
        // Helper to get absolute position considering container nesting
        const getAbsolutePosition = (component) => {
            let x = component.x;
            let y = component.y;
            let currentId = component.containerId;

            // Traverse up the container hierarchy
            while (currentId) {
                const container = allComponents.find(c => c.id === currentId);
                if (container) {
                    x += container.x;
                    y += container.y;
                    currentId = container.containerId;
                } else {
                    break;
                }
            }

            return { x, y };
        };

        // Get absolute positions
        const sourcePos = getAbsolutePosition(sourceComponent);
        const targetPos = getAbsolutePosition(targetComponent);

        const sourceX = sourcePos.x + (sourceComponent.width || 40) / 2;
        const sourceY = sourcePos.y + (sourceComponent.height || 40) / 2;
        const targetX = targetPos.x + (targetComponent.width || 40) / 2;
        const targetY = targetPos.y + (targetComponent.height || 40) / 2;

        linePoints = [sourceX, sourceY, targetX, targetY];
    }

    // If we don't have points, don't render
    if (!linePoints) return null;

    // Calculate midpoint for the delete button
    const midX = (linePoints[0] + linePoints[2]) / 2;
    const midY = (linePoints[1] + linePoints[3]) / 2;

    // Calculate the angle for the arrow
    const angle = Math.atan2(
        linePoints[3] - linePoints[1],
        linePoints[2] - linePoints[0]
    );

    // Get connection color based on type or source/target components
    let strokeColor = '#6B7280'; // Default gray

    if (isGhost) {
        strokeColor = '#3B82F6'; // Blue for ghost/preview
    } else if (isSelected) {
        strokeColor = '#3B82F6'; // Blue for selected
    } else if (connectionType !== 'default' && sourceComponent && targetComponent) {
        // Use connection type to determine color
        switch (connectionType) {
            case 'network':
                strokeColor = getAwsServiceColor('vpc');
                break;
            case 'data':
                strokeColor = getAwsServiceColor('s3');
                break;
            case 'compute':
                strokeColor = getAwsServiceColor('ec2');
                break;
            case 'database':
                strokeColor = getAwsServiceColor('rds');
                break;
            default:
                // Try to determine from component types
                const sourceType = sourceComponent.type;
                if (['ec2', 'lambda'].includes(sourceType)) {
                    strokeColor = getAwsServiceColor('ec2');
                } else if (['s3', 'ebs'].includes(sourceType)) {
                    strokeColor = getAwsServiceColor('s3');
                } else if (['rds', 'dynamodb'].includes(sourceType)) {
                    strokeColor = getAwsServiceColor('rds');
                } else if (['vpc', 'subnet', 'securityGroup', 'loadBalancer', 'internetGateway', 'natGateway'].includes(sourceType)) {
                    strokeColor = getAwsServiceColor('vpc');
                }
        }
    }

    // Determine line style based on relationship
    let lineStyle = { dash: undefined }; // Default solid

    if (connection && sourceComponent && targetComponent) {
        const sourceType = sourceComponent.type;
        const targetType = targetComponent.type;

        // Security group connections are dashed
        if (sourceType === 'securityGroup' || targetType === 'securityGroup') {
            lineStyle.dash = [5, 5];
        }

        // Network connections (VPC/subnet) are dotted
        if ((sourceType === 'vpc' && targetType === 'subnet') ||
            (sourceType === 'subnet' && targetType === 'vpc')) {
            lineStyle.dash = [2, 2];
        }

        // Load balancer connections are dashed with larger gaps
        if (sourceType === 'loadBalancer' || targetType === 'loadBalancer') {
            lineStyle.dash = [10, 5];
        }
    }

    return (
        <Group onClick={onClick}>
            {/* Main connection line */}
            <Line
                points={linePoints}
                stroke={strokeColor}
                strokeWidth={isSelected ? 2 : 1}
                dash={isGhost ? [5, 5] : lineStyle.dash}
                opacity={isGhost ? 0.6 : 1}
            />

            {/* Arrow head for direction */}
            {!isGhost && (
                <Arrow
                    points={[
                        linePoints[0],
                        linePoints[1],
                        linePoints[2],
                        linePoints[3]
                    ]}
                    pointerLength={10}
                    pointerWidth={10}
                    fill={strokeColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2 : 1}
                />
            )}

            {/* Delete button (only visible when selected) */}
            {isSelected && !isGhost && (
                <Group
                    x={midX}
                    y={midY}
                    onClick={(e) => {
                        e.cancelBubble = true; // Stop event propagation
                        onDelete && onDelete(connection.id);
                    }}
                >
                    <Circle
                        radius={8}
                        fill="#EF4444"
                        stroke="white"
                        strokeWidth={1}
                    />
                    <Text
                        x={-4}
                        y={-5}
                        text="×"
                        fontSize={12}
                        fill="white"
                    />
                </Group>
            )}

            {/* Optional connection label
      {!isGhost && connection && connection.label && (
        <Label
          x={midX}
          y={midY - 15}
          opacity={0.8}
        >
          <Tag
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth={0.5}
            cornerRadius={3}
            pointerDirection="down"
            pointerWidth={6}
            pointerHeight={6}
          />
          <Text
            text={connection.label}
            fontSize={10}
            padding={4}
            fill="#92400E"
          />
        </Label>
      )} */}
        </Group>
    );
};

export default React.memo(ConnectionLine);