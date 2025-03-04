// src/services/terraform/index.js
import { generateTerraform } from './terraformGenerator';
import {
    generateDependencyMap,
    getTopologicallySortedComponents
} from './terraformDependencyResolver';

/**
 * Exports all terraform generation functionality
 */
export {
    generateTerraform,
    generateDependencyMap,
    getTopologicallySortedComponents
};

export default {
    generateTerraform,
    generateDependencyMap,
    getTopologicallySortedComponents
};