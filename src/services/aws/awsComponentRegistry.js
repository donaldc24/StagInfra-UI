// src/services/aws/awsComponentRegistry.js
import computeComponents from './awsComputeComponents';
import storageComponents from './awsStorageComponents';
import networkingComponents from './awsNetworkingComponents';
import databaseComponents from './awsDatabaseComponents';

/**
 * Combined AWS component registry with all service types
 */
export const awsComponentRegistry = {
    ...computeComponents,
    ...storageComponents,
    ...networkingComponents,
    ...databaseComponents
};

/**
 * Gets component metadata for a specific component type
 * @param {string} type - The component type
 * @returns {Object|null} - Component metadata or null if not found
 */
export let getComponentMetadata = (type) => {
    return awsComponentRegistry[type] || null;
};

/**
 * Gets default properties for a component type
 * @param {string} type - The component type
 * @returns {Object} - Default properties
 */
export const getDefaultProperties = (type) => {
    const metadata = getComponentMetadata(type);
    return metadata ? { ...metadata.defaultProperties } : {};
};

/**
 * Gets component categories with their component types
 * @returns {Object} - Object with categories as keys and arrays of component types as values
 */
export const getComponentCategories = () => {
    const categories = {};
    Object.values(awsComponentRegistry).forEach(component => {
        if (!categories[component.category]) {
            categories[component.category] = [];
        }
        categories[component.category].push(component.type);
    });
    return categories;
};

/**
 * Validates if a connection between two component types is allowed
 * @param {string} sourceType - Source component type
 * @param {string} targetType - Target component type
 * @returns {boolean} - Whether the connection is valid
 */
export const validateConnection = (sourceType, targetType) => {
    const sourceMetadata = getComponentMetadata(sourceType);
    if (!sourceMetadata) return false;

    return sourceMetadata.allowedConnections.includes(targetType);
};

/**
 * Checks if a component can be contained by another component
 * @param {string} childType - Child component type
 * @param {string} parentType - Parent component type
 * @returns {boolean} - Whether the containment is valid
 */
export const canBeContainedBy = (childType, parentType) => {
    const childMetadata = getComponentMetadata(childType);
    const parentMetadata = getComponentMetadata(parentType);

    if (!childMetadata || !parentMetadata) return false;

    // Check if parent is a container and can contain this child type
    if (parentMetadata.isContainer && parentMetadata.canContain) {
        return parentMetadata.canContain.includes(childType);
    }

    return false;
};

/**
 * Gets the component types that a component must be contained by
 * @param {string} childType - Child component type
 * @returns {Array} - Array of component types that can contain this component
 */
export const mustBeContainedBy = (childType) => {
    const childMetadata = getComponentMetadata(childType);

    if (!childMetadata || !childMetadata.mustBeContainedBy) {
        return [];
    }

    return childMetadata.mustBeContainedBy;
};

export default awsComponentRegistry;