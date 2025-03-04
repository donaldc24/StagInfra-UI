// src/services/terraform/terraformGenerator.js
import {
    generateVpcBlock,
    generateSubnetBlock,
    findSecurityGroupsForResource,
    findContainerForComponent,
    generateVariables,
    generateOutputs
} from './terraformResourceGenerators';

import {
    organizeComponentsByHierarchy,
    generateDependencyMap,
    getTopologicallySortedComponents
} from './terraformDependencyResolver';

import {
    formatProviderBlock,
    formatTerraformCode
} from './terraformFormatter';

import { awsComponentRegistry } from '../aws/awsComponentRegistry';

/**
 * Generates Terraform code from hierarchical canvas components and connections
 *
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
    const providerBlock = formatProviderBlock('us-west-2');

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
            const securityGroups = findSecurityGroupsForResource(resource.id, hierarchy.securityGroups, connections);

            resourceBlocks.push(metadata.terraformTemplate(resource, null, securityGroups));
        }
    });

    // Generate variables
    const variables = generateVariables(components);

    // Generate outputs
    const outputs = generateOutputs(components, hierarchy);

    // Combine all sections
    return formatTerraformCode(
        'AWS Infrastructure - Hierarchical Architecture',
        providerBlock,
        variables,
        resourceBlocks.join('\n\n'),
        outputs
    );
};