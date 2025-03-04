// src/services/aws/connectionValidator.js
import { getComponentMetadata } from './awsComponentRegistry';

/**
 * Validates whether a connection can be created between two components
 * @param {Object} sourceComponent - The source component
 * @param {Object} targetComponent - The target component
 * @param {Array} existingComponents - All components currently on the canvas
 * @param {Array} existingConnections - All connections currently on the canvas
 * @returns {Object} Validation result with status and message
 */
export const validateConnection = (
    sourceComponent,
    targetComponent,
    existingComponents = [],
    existingConnections = []
) => {
    // Prevent self-connections
    if (sourceComponent.id === targetComponent.id) {
        return {
            valid: false,
            message: 'Cannot connect a component to itself'
        };
    }

    // Prevent duplicate connections
    const duplicateConnection = existingConnections.some(
        conn =>
            (conn.from === sourceComponent.id && conn.to === targetComponent.id) ||
            (conn.from === targetComponent.id && conn.to === sourceComponent.id)
    );

    if (duplicateConnection) {
        return {
            valid: false,
            message: 'This connection already exists'
        };
    }

    // Get component metadata for validation
    const sourceMetadata = getComponentMetadata(sourceComponent.type);
    const targetMetadata = getComponentMetadata(targetComponent.type);

    if (!sourceMetadata || !targetMetadata) {
        return {
            valid: false,
            message: 'Unknown component types'
        };
    }

    // Check allowed connections based on component types
    const sourceAllowed = sourceMetadata.allowedConnections || [];
    const targetAllowed = targetMetadata.allowedConnections || [];

    const isValidSourceToTarget = sourceAllowed.includes(targetComponent.type);
    const isValidTargetToSource = targetAllowed.includes(sourceComponent.type);

    if (!isValidSourceToTarget && !isValidTargetToSource) {
        return {
            valid: false,
            message: `Cannot connect ${sourceComponent.type} to ${targetComponent.type}`
        };
    }

    // Specific container-based connection rules
    if (sourceComponent.type === 'vpc' && targetComponent.type === 'subnet') {
        const existingVpcConnection = existingConnections.find(
            conn =>
                (conn.from === targetComponent.id || conn.to === targetComponent.id) &&
                (existingComponents.find(c => c.id === conn.from)?.type === 'vpc' ||
                    existingComponents.find(c => c.id === conn.to)?.type === 'vpc')
        );

        if (existingVpcConnection) {
            return {
                valid: false,
                message: 'Subnet is already assigned to a VPC'
            };
        }
    }

    if (sourceComponent.type === 'subnet' && targetComponent.type === 'ec2') {
        const existingSubnetConnection = existingConnections.find(
            conn =>
                (conn.from === targetComponent.id || conn.to === targetComponent.id) &&
                (existingComponents.find(c => c.id === conn.from)?.type === 'subnet' ||
                    existingComponents.find(c => c.id === conn.to)?.type === 'subnet')
        );

        if (existingSubnetConnection) {
            return {
                valid: false,
                message: 'EC2 instance is already assigned to a subnet'
            };
        }
    }

    // Get a descriptive message for the connection
    const description = getConnectionDescription(sourceComponent.type, targetComponent.type);

    return {
        valid: true,
        message: description
    };
};

/**
 * Gets a descriptive message for a connection type
 * @param {string} sourceType - Source component type
 * @param {string} targetType - Target component type
 * @returns {string} Connection description
 */
export const getConnectionDescription = (sourceType, targetType) => {
    const connectionDescriptions = {
        'ec2-s3': 'EC2 accessing S3 storage',
        'ec2-rds': 'EC2 connecting to RDS database',
        'lambda-s3': 'Lambda triggered by S3 events',
        'lambda-dynamodb': 'Lambda reading/writing to DynamoDB',
        'vpc-subnet': 'VPC containing subnet',
        'subnet-ec2': 'Subnet hosting EC2 instance',
        'subnet-rds': 'Subnet hosting RDS database',
        'securityGroup-ec2': 'Security Group protecting EC2',
        'loadBalancer-ec2': 'Load Balancer routing to EC2'
    };

    const connectionKey = `${sourceType}-${targetType}`;
    return connectionDescriptions[connectionKey] ||
        connectionDescriptions[`${targetType}-${sourceType}`] ||
        'Component Connection';
};

export default {
    validateConnection,
    getConnectionDescription
};