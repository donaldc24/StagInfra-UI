// src/components/HierarchicalCanvas.js
import React, { useState } from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import AwsIcon from './AwsIcon';
import ContainerComponent from './ContainerComponent';
import ConnectionLine from './canvas/ConnectionLine';
import { validateConnection } from '../services/connectionValidator';

function HierarchicalCanvas({
                                canvasComponents,
                                connections,
                                isLineMode,
                                lineStart,
                                ghostLine,
                                draggingComponent,
                                handleComponentClick,
                                handleDragMove,
                                handleDragEnd,
                                handleDeleteConnection
                            }) {
    const [selectedConnection, setSelectedConnection] = useState(null);
    const [hoveredComponent, setHoveredComponent] = useState(null);

    // Group components by their container relationships
    const organizeComponentsByHierarchy = () => {
        // Find all VPCs
        const vpcs = canvasComponents.filter(comp => comp.type === 'vpc');

        // Find all subnets and their parent VPCs
        const subnets = canvasComponents.filter(comp => comp.type === 'subnet');

        // Map subnets to their parent VPCs based on connections
        const subnetToVpcMap = new Map();
        connections.forEach(conn => {
            const fromComp = canvasComponents.find(c => c.id === conn.from);
            const toComp = canvasComponents.find(c => c.id === conn.to);

            if (fromComp && toComp) {
                // If subnet is connected to VPC
                if (fromComp.type === 'subnet' && toComp.type === 'vpc') {
                    subnetToVpcMap.set(fromComp.id, toComp.id);
                } else if (fromComp.type === 'vpc' && toComp.type === 'subnet') {
                    subnetToVpcMap.set(toComp.id, fromComp.id);
                }
            }
        });

        // Map resources to their parent subnets based on connections
        const resourceToSubnetMap = new Map();
        connections.forEach(conn => {
            const fromComp = canvasComponents.find(c => c.id === conn.from);
            const toComp = canvasComponents.find(c => c.id === conn.to);

            if (fromComp && toComp) {
                if (fromComp.type !== 'vpc' && fromComp.type !== 'subnet' && toComp.type === 'subnet') {
                    resourceToSubnetMap.set(fromComp.id, toComp.id);
                } else if (toComp.type !== 'vpc' && toComp.type !== 'subnet' && fromComp.type === 'subnet') {
                    resourceToSubnetMap.set(toComp.id, fromComp.id);
                }
            }
        });

        // Standalone resources that aren't in a subnet
        const standaloneResources = canvasComponents.filter(comp =>
            comp.type !== 'vpc' &&
            comp.type !== 'subnet' &&
            !resourceToSubnetMap.has(comp.id)
        );

        return {
            vpcs,
            subnets,
            subnetToVpcMap,
            resourceToSubnetMap,
            standaloneResources
        };
    };

    const hierarchy = organizeComponentsByHierarchy();

    // Determine if a component is valid for connection when in line mode
    const isValidConnectionTarget = (component) => {
        if (!isLineMode || !lineStart || lineStart.id === component.id) {
            return false;
        }

        const validation = validateConnection(lineStart, component);
        return validation.valid;
    };

    // Render a VPC with its subnets and resources
    const renderVpc = (vpc) => {
        // Find subnets that belong to this VPC
        const vpcSubnets = hierarchy.subnets.filter(subnet =>
            hierarchy.subnetToVpcMap.get(subnet.id) === vpc.id
        );

        // Render each subnet and its resources
        const subnetsContent = vpcSubnets.map(subnet => renderSubnet(subnet));

        return (
            <ContainerComponent
                key={vpc.id}
                component={vpc}
                onClick={(e) => handleComponentClick(vpc, e)}
                onDragMove={(e) => handleDragMove(e, vpc.id)}
                onDragEnd={(e) => handleDragEnd(e, vpc.id)}
                isSelected={lineStart && lineStart.id === vpc.id}
                isHovered={hoveredComponent === vpc.id}
                onMouseEnter={() => setHoveredComponent(vpc.id)}
                onMouseLeave={() => setHoveredComponent(null)}
            >
                {subnetsContent}
            </ContainerComponent>
        );
    };

    // Render a subnet with its resources
    const renderSubnet = (subnet) => {
        // Find resources that belong to this subnet
        const subnetResources = canvasComponents.filter(comp =>
            hierarchy.resourceToSubnetMap.get(comp.id) === subnet.id
        );

        // Render each resource in the subnet
        const resourcesContent = subnetResources.map(resource => (
            <AwsIcon
                key={resource.id}
                component={{
                    ...resource,
                    // Position relative to the subnet
                    x: resource.x - subnet.x,
                    y: resource.y - subnet.y
                }}
                onClick={(e) => handleComponentClick(resource, e)}
                onDragMove={(e) => {
                    // When dragging a resource inside a subnet, update its position relative to the subnet
                    handleDragMove({
                        target: {
                            x: () => e.target.x() + subnet.x,
                            y: () => e.target.y() + subnet.y
                        }
                    }, resource.id);
                }}
                onDragEnd={(e) => handleDragEnd(e, resource.id)}
                isSelected={lineStart && lineStart.id === resource.id}
                isValidTarget={isValidConnectionTarget(resource)}
                isHovered={hoveredComponent === resource.id}
                onMouseEnter={() => setHoveredComponent(resource.id)}
                onMouseLeave={() => setHoveredComponent(null)}
            />
        ));

        return (
            <ContainerComponent
                key={subnet.id}
                component={{
                    ...subnet,
                    // Position relative to the VPC
                    x: subnet.x - (hierarchy.subnetToVpcMap.has(subnet.id) ?
                        canvasComponents.find(c => c.id === hierarchy.subnetToVpcMap.get(subnet.id))?.x || 0 : 0),
                    y: subnet.y - (hierarchy.subnetToVpcMap.has(subnet.id) ?
                        canvasComponents.find(c => c.id === hierarchy.subnetToVpcMap.get(subnet.id))?.y || 0 : 0)
                }}
                onClick={(e) => handleComponentClick(subnet, e)}
                onDragMove={(e) => {
                    // When dragging a subnet, update its position
                    handleDragMove({
                        target: {
                            x: () => e.target.x() + (hierarchy.subnetToVpcMap.has(subnet.id) ?
                                canvasComponents.find(c => c.id === hierarchy.subnetToVpcMap.get(subnet.id))?.x || 0 : 0),
                            y: () => e.target.y() + (hierarchy.subnetToVpcMap.has(subnet.id) ?
                                canvasComponents.find(c => c.id === hierarchy.subnetToVpcMap.get(subnet.id))?.y || 0 : 0)
                        }
                    }, subnet.id);
                }}
                onDragEnd={(e) => handleDragEnd(e, subnet.id)}
                isSelected={lineStart && lineStart.id === subnet.id}
                isValidTarget={isValidConnectionTarget(subnet)}
                isHovered={hoveredComponent === subnet.id}
                onMouseEnter={() => setHoveredComponent(subnet.id)}
                onMouseLeave={() => setHoveredComponent(null)}
            >
                {resourcesContent}
            </ContainerComponent>
        );
    };

    return (
        <>
            {/* Canvas grid */}
            <Group>
                {/* Horizontal grid lines */}
                {Array.from({ length: 20 }, (_, i) => (
                    <Line
                        key={`h-${i}`}
                        points={[200, i * 20, 800, i * 20]}
                        stroke="#e0e0e0"
                        strokeWidth={1}
                    />
                ))}

                {/* Vertical grid lines */}
                {Array.from({ length: 30 }, (_, i) => (
                    <Line
                        key={`v-${i}`}
                        points={[200 + i * 20, 0, 200 + i * 20, 400]}
                        stroke="#e0e0e0"
                        strokeWidth={1}
                    />
                ))}
            </Group>

            {/* Canvas area */}
            <Rect x={200} y={0} width={600} height={400} fill="#F5F5F5" stroke="#cccccc" strokeWidth={1} />

            {/* Right sidebar area */}
            <Rect x={800} y={0} width={200} height={400} fill="white" stroke="gray" strokeWidth={1} />

            {/* Trash area */}
            <Rect x={800} y={0} width={200} height={200} fill="#ffcccc" stroke="red" strokeWidth={2} />
            <Text x={875} y={90} text="Trash" fontSize={16} fill="red" align="center" width={50} />

            {/* VPC containers with their hierarchy */}
            {hierarchy.vpcs.map(vpc => renderVpc(vpc))}

            {/* Standalone subnets that aren't in a VPC */}
            {hierarchy.subnets
                .filter(subnet => !hierarchy.subnetToVpcMap.has(subnet.id))
                .map(subnet => renderSubnet(subnet))}

            {/* Standalone resources that aren't in a subnet */}
            {hierarchy.standaloneResources.map(comp => (
                <AwsIcon
                    key={comp.id}
                    component={comp}
                    onClick={(e) => handleComponentClick(comp, e)}
                    onDragMove={(e) => handleDragMove(e, comp.id)}
                    onDragEnd={(e) => handleDragEnd(e, comp.id)}
                    isSelected={lineStart && lineStart.id === comp.id}
                    isValidTarget={isValidConnectionTarget(comp)}
                    isHovered={hoveredComponent === comp.id}
                    onMouseEnter={() => setHoveredComponent(comp.id)}
                    onMouseLeave={() => setHoveredComponent(null)}
                />
            ))}

            {/* Connection lines */}
            {connections.map((conn) => {
                const fromComp = canvasComponents.find(c => c.id === conn.from);
                const toComp = canvasComponents.find(c => c.id === conn.to);
                if (fromComp && toComp) {
                    // Skip rendering connections between containers and their contents
                    // (These are represented by the container hierarchy)
                    if (
                        (fromComp.type === 'vpc' && toComp.type === 'subnet') ||
                        (fromComp.type === 'subnet' && toComp.type === 'vpc') ||
                        (hierarchy.resourceToSubnetMap.get(fromComp.id) === toComp.id) ||
                        (hierarchy.resourceToSubnetMap.get(toComp.id) === fromComp.id)
                    ) {
                        return null;
                    }

                    return (
                        <ConnectionLine
                            key={`${conn.from}-${conn.to}`}
                            connection={conn}
                            fromComponent={fromComp}
                            toComponent={toComp}
                            onDelete={handleDeleteConnection}
                            isSelected={selectedConnection === `${conn.from}-${conn.to}`}
                            setSelected={() => setSelectedConnection(`${conn.from}-${conn.to}`)}
                        />
                    );
                }
                return null;
            })}

            {/* Ghost line for when creating a connection */}
            {isLineMode && lineStart && ghostLine && (
                <Line
                    points={ghostLine.points}
                    stroke="#0066cc"
                    strokeWidth={2}
                    opacity={0.5}
                    dash={[5, 5]}
                />
            )}

            {/* Dragging component preview */}
            {draggingComponent && (
                <Group
                    x={draggingComponent.x - draggingComponent.width / 2}
                    y={draggingComponent.y - draggingComponent.height / 2}
                    opacity={0.5}
                >
                    <Rect
                        width={draggingComponent.width || 40}
                        height={draggingComponent.height || 40}
                        fill={draggingComponent.color || draggingComponent.fill}
                        stroke="#333"
                        strokeWidth={1}
                        dash={[5, 5]}
                        cornerRadius={4}
                    />
                    <Text
                        text={draggingComponent.displayName || draggingComponent.type?.toUpperCase()}
                        fontSize={10}
                        fill="#333"
                        width={(draggingComponent.width || 40) * 1.5}
                        align="center"
                        x={-(draggingComponent.width || 40) * 0.25}
                        y={(draggingComponent.height || 40) + 5}
                    />
                </Group>
            )}

            {/* Connection Validation Helper Text */}
            {isLineMode && lineStart && (
                <Text
                    x={600}
                    y={10}
                    text="Select a valid target component to connect"
                    fontSize={12}
                    fill="#333"
                    align="center"
                    width={180}
                    padding={5}
                    background="#ffffcc"
                />
            )}
        </>
    );
}

export default HierarchicalCanvas;