// src/services/utils/resourceNameUtils.js

/**
 * Sanitizes a resource name for use in Terraform
 * Terraform resource names must be alphanumeric or underscores
 *
 * @param {string} name - The name to sanitize
 * @returns {string} - Sanitized name
 */
export const sanitizeResourceName = (name) => {
    if (!name) return '';
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
};

/**
 * Creates a unique identifier for a component
 *
 * @param {string} prefix - Type prefix (e.g., 'ec2', 's3')
 * @param {string} [id] - Optional existing ID
 * @returns {string} - Unique identifier
 */
export const createResourceId = (prefix, id = null) => {
    if (id) {
        return `${prefix}-${id.slice(-4)}`;
    }
    return `${prefix}-${Date.now().toString().slice(-8)}`;
};

/**
 * Generates a display name for a component
 *
 * @param {string} type - Component type
 * @param {string} name - Custom name (if provided)
 * @param {string} id - Component ID
 * @returns {string} - Display name
 */
export const getDisplayName = (type, name, id) => {
    if (name) return name;
    return `${type.toUpperCase()}-${id.slice(-4)}`;
};

export default {
    sanitizeResourceName,
    createResourceId,
    getDisplayName
};