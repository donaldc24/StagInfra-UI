// src/services/hierarchicalConnectionValidator.js
import { getComponentMetadata } from './hierarchicalAwsComponentRegistry';

/**
 * Validates whether a connection can be created between two components
 * Includes additional rules for AWS architectural constraints
 * @param {Object} sourceComponent - The source component
 * @param {Object} targetComponent - The target component
 * @param {Array} existingComponents - All components currently on the canvas
 * @param {Array} existingConnections - All connections currently on the canvas
 * @returns {Object} Validation result with status and message
 */
export const validateConnection = (sourceComponent, targetComponent, existingComponents = [], existingConnections = []) => {
    // If either component is null, connection is invalid
    if (!sourceComponent || !targetComponent) {
        return {
            valid: false,
            message: 'Both source and target components must exist'
        };
    }

    // Check component-specific connection rules
    const result = checkComponentSpecificRules(sourceComponent, targetComponent, existingComponents, existingConnections);
    if (result) {
        return result;
    }

    // Check if source component allows connections to the target component type
    const sourceMetadata = getComponentMetadata(sourceComponent.type);
    if (!sourceMetadata) {
        return {
            valid: false,
            message: `Unknown source component type: ${sourceComponent.type}`
        };
    }

    // Check if this component type is allowed to connect to the target type
    if (!sourceMetadata.allowedConnections.includes(targetComponent.type)) {
        return {
            valid: false,
            message: `${sourceMetadata.displayName} cannot connect to ${getComponentMetadata(targetComponent.type)?.displayName || targetComponent.type}`
        };
    }

    // Prevent circular connections
    if (hasDependencyCycle(sourceComponent.id, targetComponent.id, existingConnections)) {
        return {
            valid: false,
            message: 'This connection would create a circular dependency'
        };
    }

    // All validations passed
    return {
        valid: true,
        message: getConnectionDescription(sourceComponent, targetComponent)
    };
};

/**
 * Checks component-specific rules for valid connections
 * @param {Object} sourceComponent - The source component
 * @param {Object} targetComponent - The target component
 * @param {Array} existingComponents - All components currently on the canvas
 * @param {Array} existingConnections - All connections currently on the canvas
 * @returns {Object|null} Validation result or null if no specific rules apply
 */
const checkComponentSpecificRules = (sourceComponent, targetComponent, existingComponents, existingConnections) => {
    // Check VPC-Subnet placement rules
    if (sourceComponent.type === 'subnet' && targetComponent.type === 'vpc') {
        // A subnet can only be placed in one VPC
        const existingVpcConnection = existingConnections.find(conn =>
            (conn.from === sourceComponent.id && existingComponents.find(c => c.id === conn.to)?.type === 'vpc') ||
            (conn.to === sourceComponent.id && existingComponents.find(c => c.id === conn.from)?.type === 'vpc')
        );

        if (existingVpcConnection) {
            return {
                valid: false,
                message: 'This subnet is already placed in a VPC'
            };
        }

        return {
            valid: true,
            message: 'This will place the subnet in this VPC'
        };
    }

    if (sourceComponent.type === 'vpc' && targetComponent.type === 'subnet') {
        // A subnet can only be placed in one VPC
        const existingVpcConnection = existingConnections.find(conn =>
            (conn.from === targetComponent.id && existingComponents.find(c => c.id === conn.to)?.type === 'vpc') ||
            (conn.to === targetComponent.id && existingComponents.find(c => c.id === conn.from)?.type === 'vpc')
        );

        if (existingVpcConnection) {
            return {
                valid: false,
                message: 'This subnet is already placed in a VPC'
            };
        }

        return {
            valid: true,
            message: 'This will place the subnet in this VPC'
        };
    }

    // Check EC2 placement rules (EC2 must be in a subnet)
    if (sourceComponent.type === 'ec2' && targetComponent.type === 'subnet') {
        // An EC2 instance can only be placed in one subnet
        const existingSubnetConnection = existingConnections.find(conn =>
            (conn.from === sourceComponent.id && existingComponents.find(c => c.id === conn.to)?.type === 'subnet') ||
            (conn.to === sourceComponent.id && existingComponents.find(c => c.id === conn.from)?.type === 'subnet')
        );

        if (existingSubnetConnection) {
            return {
                valid: false,
                message: 'This EC2 instance is already placed in a subnet'
            };
        }

        return {
            valid: true,
            message: 'This will place the EC2 instance in this subnet'
        };
    }

    if (sourceComponent.type === 'subnet' && targetComponent.type === 'ec2') {
        // An EC2 instance can only be placed in one subnet
        const existingSubnetConnection = existingConnections.find(conn =>
            (conn.from === targetComponent.id && existingComponents.find(c => c.id === conn.to)?.type === 'subnet') ||
            (conn.to === targetComponent.id && existingComponents.find(c => c.id === conn.from)?.type === 'subnet')
        );

        if (existingSubnetConnection) {
            return {
                valid: false,
                message: 'This EC2 instance is already placed in a subnet'
            };
        }

        return {
            valid: true,
            message: 'This will place the EC2 instance in this subnet'
        };
    }

    // Check RDS placement rules (RDS must be in at least one subnet)
    if ((sourceComponent.type === 'rds' && targetComponent.type === 'subnet') ||
        (sourceComponent.type === 'subnet' && targetComponent.type === 'rds')) {
        // RDS can be in multiple subnets (for Multi-AZ), so we allow multiple connections
        return {
            valid: true,
            message: 'This will place the database in this subnet'
        };
    }

    // Check security group rules
    if (sourceComponent.type === 'securityGroup' || targetComponent.type === 'securityGroup') {
        const resourceComponent = sourceComponent.type === 'securityGroup' ? targetComponent : sourceComponent;

        // Security groups can only be attached to certain resource types
        const validSecurityGroupTargets = ['ec2', 'rds', 'elasticache', 'loadBalancer'];
        if (!validSecurityGroupTargets.includes(resourceComponent.type)) {
            return {
                valid: false,
                message: `Security groups cannot be attached to ${resourceComponent.type}`
            };
        }

        return {
            valid: true,
            message: 'This will attach the security group to this resource'
        };
    }

    // No specific rules apply
    return null;
};

/**
 * Checks if adding a connection would create a dependency cycle
 * @param {string} sourceId - Source component ID
 * @param {string} targetId - Target component ID
 * @param {Array} existingConnections - Existing connections
 * @returns {boolean} Whether a cycle would be created
 */
const hasDependencyCycle = (sourceId, targetId, existingConnections) => {
    // If we're trying to connect target→source and source→target already exists
    return existingConnections.some(conn =>
        (conn.from === targetId && conn.to === sourceId)
    );
};

/**
 * Gets the description of the relationship between two components
 * @param {Object} sourceComponent - The source component
 * @param {Object} targetComponent - The target component
 * @returns {string} Description of the relationship
 */
export const getConnectionDescription = (sourceComponent, targetComponent) => {
    if (!sourceComponent || !targetComponent) {
        return '';
    }

    const sourceMeta = getComponentMetadata(sourceComponent.type);
    const targetMeta = getComponentMetadata(targetComponent.type);

    if (!sourceMeta || !targetMeta) {
        return '';
    }

    // Special descriptions for resource placement
    if (targetComponent.type === 'subnet') {
        return 'Placed in';
    }

    if (targetComponent.type === 'vpc' && sourceComponent.type === 'subnet') {
        return 'Part of';
    }

    if (sourceComponent.type === 'securityGroup') {
        return 'Secures';
    }

    if (targetComponent.type === 'securityGroup') {
        return 'Protected by';
    }

    // Specific connection descriptions for other cases
    const connectionTypes = {
        'ec2-s3': 'Accesses data in',
        'ec2-rds': 'Connects to database in',
        'lambda-s3': 'Triggered by events from',
        'lambda-dynamodb': 'Reads/writes data to',
        'ec2-subnet': 'Deployed in',
        'rds-subnet': 'Deployed in',
        'vpc-subnet': 'Contains',
        'loadBalancer-ec2': 'Routes traffic to',
    };

    const connectionKey = `${sourceComponent.type}-${targetComponent.type}`;
    return connectionTypes[connectionKey] || 'Connected to';
};