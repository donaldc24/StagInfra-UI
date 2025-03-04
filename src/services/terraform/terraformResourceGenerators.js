// src/services/terraform/terraformResourceGenerators.js
import { sanitizeResourceName } from '../utils/resourceNameUtils';
import { awsComponentRegistry } from '../aws/awsComponentRegistry';

/**
 * Generates Terraform code for a VPC and its contained components
 *
 * @param {Object} vpc - VPC component
 * @param {Object} hierarchy - Component hierarchy
 * @returns {string} - Terraform code for the VPC and its contents
 */
export const generateVpcBlock = (vpc, hierarchy) => {
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
 *
 * @param {Object} subnet - Subnet component
 * @param {Object} parentVpc - Parent VPC component or null
 * @param {Object} hierarchy - Component hierarchy
 * @returns {string} - Terraform code for the subnet and its contents
 */
export const generateSubnetBlock = (subnet, parentVpc, hierarchy) => {
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
            const securityGroups = findSecurityGroupsForResource(resource.id, hierarchy.securityGroups, hierarchy.connections);

            blocks.push(metadata.terraformTemplate(resource, subnet, securityGroups));
        }
    });

    return blocks.join('\n\n');
};

/**
 * Finds security groups connected to a resource
 *
 * @param {string} resourceId - ID of the resource
 * @param {Array} securityGroups - All security group components
 * @param {Array} connections - All connections
 * @returns {Array} - Security groups connected to the resource
 */
export const findSecurityGroupsForResource = (resourceId, securityGroups, connections) => {
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
 *
 * @param {string} componentId - ID of the component
 * @param {Array} containers - Potential container components
 * @param {Array} connections - All connections
 * @returns {Object|null} - Container component or null
 */
export const findContainerForComponent = (componentId, containers, connections) => {
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
 *
 * @param {Array} components - Canvas components
 * @returns {string} - Terraform variables
 */
export const generateVariables = (components) => {
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
 *
 * @param {Array} components - Canvas components
 * @param {Object} hierarchy - Component hierarchy
 * @returns {string} - Terraform outputs
 */
export const generateOutputs = (components, hierarchy) => {
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