// src/services/connectionValidator.js
import { getComponentMetadata } from './awsComponentRegistry';

/**
 * Validates whether a connection can be created between two components
 * @param {Object} sourceComponent - The source component
 * @param {Object} targetComponent - The target component
 * @returns {Object} Validation result with status and message
 */
export const validateConnection = (sourceComponent, targetComponent) => {
    // If either component is null, connection is invalid
    if (!sourceComponent || !targetComponent) {
        return {
            valid: false,
            message: 'Both source and target components must exist'
        };
    }

    // Check if source component allows connections to the target component type
    const sourceMetadata = getComponentMetadata(sourceComponent.type);
    if (!sourceMetadata) {
        return {
            valid: false,
            message: `Unknown source component type: ${sourceComponent.type}`
        };
    }

    if (!sourceMetadata.allowedConnections.includes(targetComponent.type)) {
        return {
            valid: false,
            message: `${sourceMetadata.displayName} cannot connect to ${getComponentMetadata(targetComponent.type)?.displayName || targetComponent.type}`
        };
    }

    // Special validation for subnet-related connections
    // Rather than requiring RDS to be in a subnet first, we'll allow the connection
    // and interpret it as "placing the RDS in this subnet"
    if (targetComponent.type === 'subnet') {
        return {
            valid: true,
            message: `This will place the ${sourceMetadata.displayName} in this subnet`
        };
    }

    if (sourceComponent.type === 'subnet' && targetComponent.type === 'vpc') {
        return {
            valid: true,
            message: `This will place the subnet in this VPC`
        };
    }

    // Securitygroups can be associated with various resources
    if (sourceComponent.type === 'securityGroup' || targetComponent.type === 'securityGroup') {
        return {
            valid: true,
            message: 'This will associate the security group with this resource'
        };
    }

    // VPC related resources don't need explicit subnet connections in this tool
    // This simplifies the UX while still allowing logical connections

    // Prevent circular connections
    if (hasDependencyCycle(sourceComponent.id, targetComponent.id)) {
        return {
            valid: false,
            message: 'This connection would create a circular dependency'
        };
    }

    // All validations passed
    return {
        valid: true,
        message: 'Connection is valid'
    };
};

/**
 * Checks if adding a connection would create a dependency cycle
 * Note: In a real implementation, this would use the actual connections from state
 * @param {string} sourceId - Source component ID
 * @param {string} targetId - Target component ID
 * @returns {boolean} Whether a cycle would be created
 */
const hasDependencyCycle = (sourceId, targetId) => {
    // This is a placeholder - in a real implementation,
    // you would check the existing connections to detect cycles
    return false;
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