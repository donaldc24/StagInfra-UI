// src/services/hierarchicalTerraformGenerator.js
import { awsComponentRegistry, sanitizeResourceName } from './hierarchicalAwsComponentRegistry';

/**
 * Generates Terraform code from hierarchical canvas components and connections
 * @param {Array} components - Canvas components
 * @param {Array} connections - Component connections
 * @returns {string} - Generated Terraform code
 */
export const generateTerraform = (components, connections) => {
    if (!components || components.length === 0) {
        return '// No components added to the canvas yet.';
    }

    // Organize components by hierarchy
    const hierarchy = organizeComponentsByHierarchy(components, connections);

    // Generate provider block
    const providerBlock = `
provider "aws" {
  region = "us-west-2"
}
`.trim();

    // Generate all resource blocks in the correct order (containers first)
    const resourceBlocks = [];

    // Generate VPC blocks first
    hierarchy.vpcs.forEach(vpc => {
        resourceBlocks.push(generateVpcBlock(vpc, hierarchy));
    });

    // Generate standalone subnet blocks (not in VPCs)
    hierarchy.standaloneSubnets.forEach(subnet => {
        resourceBlocks.push(generateSubnetBlock(subnet, null, hierarchy));
    });

    // Generate security group blocks
    hierarchy.securityGroups.forEach(sg => {
        // Find parent VPC if any
        const parentVpc = findContainerForComponent(sg.id, hierarchy.vpcs, connections);
        resourceBlocks.push(awsComponentRegistry.securityGroup.terraformTemplate(sg, parentVpc));
    });

    // Generate standalone resources (not in subnets)
    hierarchy.standaloneResources.forEach(resource => {
        const metadata = awsComponentRegistry[resource.type];
        if (metadata && metadata.terraformTemplate) {
            // Get security groups connected to this resource
            const securityGroups = findSecurityGroupsForResource(resource.id, components, connections);

            resourceBlocks.push(metadata.terraformTemplate(resource, null, securityGroups));
        }
    });

    // Generate variables
    const variables = generateVariables(components);

    // Generate outputs
    const outputs = generateOutputs(components, hierarchy);

    // Combine all sections
    return [
        '# AWS Infrastructure - Hierarchical Architecture',
        providerBlock,
        variables,
        resourceBlocks.join('\n\n'),
        outputs
    ].filter(Boolean).join('\n\n');
};

/**
 * Organizes components into a hierarchical structure based on connections
 * @param {Array} components - Canvas components
 * @param {Array} connections - Component connections
 * @returns {Object} - Hierarchical organization of components
 */
const organizeComponentsByHierarchy = (components, connections) => {
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
        standaloneResources
    };
};

/**
 * Generates Terraform code for a VPC and its contained components
 * @param {Object} vpc - VPC component
 * @param {Object} hierarchy - Component hierarchy
 * @returns {string} - Terraform code for the VPC and its contents
 */
const generateVpcBlock = (vpc, hierarchy) => {
    const blocks = [];

    // Add VPC resource block
    blocks.push(awsComponentRegistry.vpc.terraformTemplate(vpc));

    // Find subnets that belong to this VPC
    const vpcSubnets = hierarchy.subnets.filter(subnet =>
        hierarchy.subnetToVpcMap.get(subnet.id) === vpc.id
    );

    // Generate subnet blocks
    vpcSubnets.forEach(subnet => {
        blocks.push(generateSubnetBlock(subnet, vpc, hierarchy));
    });

    return blocks.join('\n\n');
};

/**
 * Generates Terraform code for a subnet and its contained resources
 * @param {Object} subnet - Subnet component
 * @param {Object} parentVpc - Parent VPC component or null
 * @param {Object} hierarchy - Component hierarchy
 * @returns {string} - Terraform code for the subnet and its contents
 */
const generateSubnetBlock = (subnet, parentVpc, hierarchy) => {
    const blocks = [];

    // Add subnet resource block
    blocks.push(awsComponentRegistry.subnet.terraformTemplate(subnet, parentVpc));

    // Find resources that belong to this subnet
    const subnetResources = hierarchy.standaloneResources.filter(resource =>
        hierarchy.resourceToSubnetMap.get(resource.id) === subnet.id
    );

    // Generate resource blocks
    subnetResources.forEach(resource => {
        const metadata = awsComponentRegistry[resource.type];
        if (metadata && metadata.terraformTemplate) {
            // Get security groups connected to this resource
            const securityGroups = findSecurityGroupsForResource(resource.id, hierarchy.securityGroups);

            blocks.push(metadata.terraformTemplate(resource, subnet, securityGroups));
        }
    });

    return blocks.join('\n\n');
};

/**
 * Finds security groups connected to a resource
 * @param {string} resourceId - ID of the resource
 * @param {Array} securityGroups - All security group components
 * @param {Array} connections - All connections
 * @returns {Array} - Security groups connected to the resource
 */
const findSecurityGroupsForResource = (resourceId, securityGroups, connections) => {
    const connectedSgIds = connections
        .filter(conn =>
            (conn.from === resourceId && securityGroups.some(sg => sg.id === conn.to)) ||
            (conn.to === resourceId && securityGroups.some(sg => sg.id === conn.from))
        )
        .map(conn => conn.from === resourceId ? conn.to : conn.from);

    return securityGroups.filter(sg => connectedSgIds.includes(sg.id));
};

/**
 * Finds the container component for a given component
 * @param {string} componentId - ID of the component
 * @param {Array} containers - Potential container components
 * @param {Array} connections - All connections
 * @returns {Object|null} - Container component or null
 */
const findContainerForComponent = (componentId, containers, connections) => {
    for (const container of containers) {
        const isContained = connections.some(conn =>
            (conn.from === componentId && conn.to === container.id) ||
            (conn.from === container.id && conn.to === componentId)
        );

        if (isContained) {
            return container;
        }
    }

    return null;
};

/**
 * Generates Terraform variables
 * @param {Array} components - Canvas components
 * @returns {string} - Terraform variables
 */
const generateVariables = (components) => {
    // Extract common values that should be variables
    const variableSet = new Set();
    components.forEach(component => {
        // Add component-specific variables
        if (component.type === 'ec2' && component.instance_type) {
            variableSet.add('instance_type');
        }
    });

    if (variableSet.size === 0) return '';

    // Generate variable blocks
    const variables = Array.from(variableSet).map(varName => {
        switch (varName) {
            case 'instance_type':
                return `
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}`.trim();
            default:
                return '';
        }
    }).filter(Boolean).join('\n\n');

    return variables;
};

/**
 * Generates Terraform outputs
 * @param {Array} components - Canvas components
 * @param {Object} hierarchy - Component hierarchy
 * @returns {string} - Terraform outputs
 */
const generateOutputs = (components, hierarchy) => {
    // Generate useful outputs
    const outputBlocks = [];

    // Add VPC outputs
    hierarchy.vpcs.forEach(vpc => {
        const resourceName = sanitizeResourceName(vpc.name || `vpc-${vpc.id.slice(-4)}`);
        outputBlocks.push(`
output "${resourceName}_id" {
  description = "ID of the VPC"
  value       = aws_vpc.${resourceName}.id
}`.trim());
    });

    // Add component-specific outputs
    components.forEach(component => {
        if (component.type === 'ec2') {
            const resourceName = sanitizeResourceName(component.name || `ec2-${component.id.slice(-4)}`);
            outputBlocks.push(`
output "${resourceName}_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.${resourceName}.*.public_ip
}`.trim());
        } else if (component.type === 's3') {
            const resourceName = sanitizeResourceName(component.name || `s3-${component.id.slice(-4)}`);
            outputBlocks.push(`
output "${resourceName}_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.${resourceName}.bucket
}`.trim());
        } else if (component.type === 'rds') {
            const resourceName = sanitizeResourceName(component.name || `rds-${component.id.slice(-4)}`);
            outputBlocks.push(`
output "${resourceName}_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.${resourceName}.endpoint
}`.trim());
        } else if (component.type === 'loadBalancer') {
            const resourceName = sanitizeResourceName(component.name || `lb-${component.id.slice(-4)}`);
            outputBlocks.push(`
output "${resourceName}_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.${resourceName}.dns_name
}`.trim());
        }
    });

    if (outputBlocks.length === 0) return '';
    return outputBlocks.join('\n\n');
};

/**
 * Generates a list of which components depend on others based on the architecture
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