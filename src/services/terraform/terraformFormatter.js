// src/services/terraform/terraformFormatter.js

/**
 * Formats a Terraform provider block
 *
 * @param {string} [region='us-west-2'] - AWS region
 * @returns {string} - Formatted provider block
 */
export const formatProviderBlock = (region = 'us-west-2') => {
    return `
provider "aws" {
  region = "${region}"
}
`.trim();
};

/**
 * Formats an AWS resource block
 *
 * @param {string} resourceType - AWS resource type
 * @param {string} resourceName - Terraform resource name
 * @param {Object} attributes - Resource attributes
 * @param {Array} [tags=[]] - Resource tags
 * @returns {string} - Formatted resource block
 */
export const formatResourceBlock = (resourceType, resourceName, attributes, tags = []) => {
    const formattedAttributes = Object.entries(attributes)
        .map(([key, value]) => {
            // Format value based on type
            let formattedValue;
            if (typeof value === 'string') {
                formattedValue = `"${value}"`;
            } else if (typeof value === 'boolean') {
                formattedValue = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                formattedValue = value;
            } else if (Array.isArray(value)) {
                formattedValue = `[${value.map(item =>
                    typeof item === 'string' ? `"${item}"` : item
                ).join(', ')}]`;
            } else if (value === null || value === undefined) {
                return null; // Skip null or undefined values
            } else {
                formattedValue = `"${value.toString()}"`;
            }

            return `  ${key} = ${formattedValue}`;
        })
        .filter(Boolean) // Remove null values
        .join('\n');

    // Format tags
    let tagsBlock = '';
    if (tags && tags.length > 0) {
        tagsBlock = `
  tags = {
${tags.map(tag => `    ${tag.key} = "${tag.value}"`).join('\n')}
  }`;
    }

    return `
resource "${resourceType}" "${resourceName}" {
${formattedAttributes}${tagsBlock}
}`.trim();
};

/**
 * Formats a Terraform variable declaration
 *
 * @param {string} name - Variable name
 * @param {string} description - Variable description
 * @param {string} type - Variable type (e.g., 'string', 'number')
 * @param {any} defaultValue - Default value
 * @returns {string} - Formatted variable declaration
 */
export const formatVariable = (name, description, type, defaultValue) => {
    let defaultValueStr = '';

    if (defaultValue !== undefined) {
        if (typeof defaultValue === 'string') {
            defaultValueStr = `  default     = "${defaultValue}"`;
        } else if (Array.isArray(defaultValue)) {
            defaultValueStr = `  default     = [${defaultValue.map(v =>
                typeof v === 'string' ? `"${v}"` : v
            ).join(', ')}]`;
        } else {
            defaultValueStr = `  default     = ${defaultValue}`;
        }
    }

    return `
variable "${name}" {
  description = "${description}"
  type        = ${type}
${defaultValueStr ? defaultValueStr : ''}
}`.trim();
};

/**
 * Formats a Terraform output declaration
 *
 * @param {string} name - Output name
 * @param {string} description - Output description
 * @param {string} value - Output value expression
 * @returns {string} - Formatted output declaration
 */
export const formatOutput = (name, description, value) => {
    return `
output "${name}" {
  description = "${description}"
  value       = ${value}
}`.trim();
};

/**
 * Formats complete Terraform code
 *
 * @param {string} title - Title comment
 * @param {string} provider - Provider block
 * @param {string} variables - Variables block
 * @param {string} resources - Resources block
 * @param {string} outputs - Outputs block
 * @returns {string} - Complete formatted Terraform code
 */
export const formatTerraformCode = (title, provider, variables, resources, outputs) => {
    const sections = [
        `# ${title}`,
        provider,
        variables,
        resources,
        outputs
    ].filter(Boolean);

    return sections.join('\n\n');
};

export default {
    formatProviderBlock,
    formatResourceBlock,
    formatVariable,
    formatOutput,
    formatTerraformCode
};