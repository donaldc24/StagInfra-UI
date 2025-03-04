// src/services/terraform/terraformDependencyResolver.js

/**
 * Organizes components into a hierarchical structure based on connections
 *
 * @param {Array} components - Canvas components
 * @param {Array} connections - Component connections
 * @returns {Object} - Hierarchical organization of components
 */
export const organizeComponentsByHierarchy = (components, connections) => {
    // Find all VPCs
    const vpcs = components.filter(comp => comp.type === 'vpc');

    // Find all subnets
    const subnets = components.filter(comp => comp.type === 'subnet');

    // Find all security groups
    const securityGroups = components.filter(comp => comp.type === 'securityGroup');

    // Map subnets to their parent VPCs based on connections
    const subnetToVpcMap = new Map();
    connections.forEach(conn => {
        const fromComp = components.find(c => c.id === conn.from);
        const toComp = components.find(c => c.id === conn.to);

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
        const fromComp = components.find(c => c.id === conn.from);
        const toComp = components.find(c => c.id === conn.to);

        if (fromComp && toComp) {
            if (fromComp.type !== 'vpc' && fromComp.type !== 'subnet' && toComp.type === 'subnet') {
                resourceToSubnetMap.set(fromComp.id, toComp.id);
            } else if (toComp.type !== 'vpc' && toComp.type !== 'subnet' && fromComp.type === 'subnet') {
                resourceToSubnetMap.set(toComp.id, fromComp.id);
            }
        }
    });

    // Standalone subnets (not in a VPC)
    const standaloneSubnets = subnets.filter(subnet => !subnetToVpcMap.has(subnet.id));

    // Standalone resources (not in a subnet)
    const standaloneResources = components.filter(comp =>
        comp.type !== 'vpc' &&
        comp.type !== 'subnet' &&
        comp.type !== 'securityGroup' &&
        !resourceToSubnetMap.has(comp.id)
    );

    return {
        vpcs,
        subnets,
        securityGroups,
        subnetToVpcMap,
        resourceToSubnetMap,
        standaloneSubnets,
        standaloneResources,
        connections
    };
};

/**
 * Generates a list of which components depend on others based on the architecture
 *
 * @param {Array} components - Canvas components
 * @param {Array} connections - Component connections
 * @returns {Object} - Map of component dependencies
 */
export const generateDependencyMap = (components, connections) => {
    const dependencyMap = {};

    // Initialize dependency map for all components
    components.forEach(component => {
        dependencyMap[component.id] = [];
    });

    // Process containment relationships (VPC contains subnet, subnet contains resources)
    connections.forEach(conn => {
        const sourceComp = components.find(c => c.id === conn.from);
        const targetComp = components.find(c => c.id === conn.to);

        if (!sourceComp || !targetComp) return;

        // If source is a container and target is contained (e.g., VPC -> Subnet)
        if (
            (sourceComp.type === 'vpc' && targetComp.type === 'subnet') ||
            (sourceComp.type === 'subnet' && ['ec2', 'rds', 'loadBalancer', 'lambda'].includes(targetComp.type))
        ) {
            // The contained component depends on the container
            dependencyMap[targetComp.id].push(sourceComp.id);
        }
        // If target is a container and source is contained
        else if (
            (targetComp.type === 'vpc' && sourceComp.type === 'subnet') ||
            (targetComp.type === 'subnet' && ['ec2', 'rds', 'loadBalancer', 'lambda'].includes(sourceComp.type))
        ) {
            // The contained component depends on the container
            dependencyMap[sourceComp.id].push(targetComp.id);
        }
        // Security group associations
        else if (sourceComp.type === 'securityGroup' || targetComp.type === 'securityGroup') {
            const resourceComp = sourceComp.type === 'securityGroup' ? targetComp : sourceComp;
            const sgComp = sourceComp.type === 'securityGroup' ? sourceComp : targetComp;

            // The resource depends on the security group
            dependencyMap[resourceComp.id].push(sgComp.id);
        }
        // Other explicit service connections
        else {
            // For connections between services (e.g., EC2 to RDS), we don't specify direct dependencies
            // as Terraform will handle these via the generated connection blocks
        }
    });

    return dependencyMap;
};

/**
 * Gets a sorted list of components where dependencies come before dependents
 *
 * @param {Array} components - Canvas components
 * @param {Object} dependencyMap - Component dependency map
 * @returns {Array} - Topologically sorted components
 */
export const getTopologicallySortedComponents = (components, dependencyMap) => {
    const visited = new Set();
    const sortedComponents = [];

    function visit(componentId) {
        if (visited.has(componentId)) return;
        visited.add(componentId);

        // Visit dependencies first
        for (const depId of dependencyMap[componentId] || []) {
            visit(depId);
        }

        // Add component to sorted list
        const component = components.find(c => c.id === componentId);
        if (component) {
            sortedComponents.push(component);
        }
    }

    // Visit all components
    for (const component of components) {
        visit(component.id);
    }

    return sortedComponents;
};

export default {
    organizeComponentsByHierarchy,
    generateDependencyMap,
    getTopologicallySortedComponents
};