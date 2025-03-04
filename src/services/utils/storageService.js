// 1. First, let's update the storageService.js file to ensure components and connections are saved whenever they change

// src/services/storageService.js
import { debounce } from 'lodash';

// Key names for localStorage
const COMPONENTS_KEY = 'staginfra_components';
const CONNECTIONS_KEY = 'staginfra_connections';

/**
 * Save components to localStorage
 * @param {Array} components - Array of component objects
 */
export const saveComponents = (components) => {
    try {
        const validComponents = components.filter(c => c && c.id && c.type);
        if (validComponents.length > 0 || components.length === 0) {
            localStorage.setItem(COMPONENTS_KEY, JSON.stringify(validComponents));
            console.log(`Saved ${validComponents.length} components to localStorage`);
        }
    } catch (error) {
        console.error('Error saving components to localStorage:', error);
    }
};

/**
 * Retrieve components from localStorage
 * @returns {Array} Array of component objects or empty array if none found
 */
export const getComponents = () => {
    try {
        const data = localStorage.getItem(COMPONENTS_KEY);
        if (!data) return [];

        const components = JSON.parse(data);
        console.log(`Retrieved ${components.length} components from localStorage`);
        return Array.isArray(components) ? components : [];
    } catch (error) {
        console.error('Error retrieving components from localStorage:', error);
        return [];
    }
};

/**
 * Save connections to localStorage
 * @param {Array} connections - Array of connection objects
 */
export const saveConnections = (connections) => {
    try {
        const validConnections = connections.filter(c => c && c.id && c.from && c.to);
        localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(validConnections));
        console.log(`Saved ${validConnections.length} connections to localStorage`);
    } catch (error) {
        console.error('Error saving connections to localStorage:', error);
    }
};

/**
 * Retrieve connections from localStorage
 * @returns {Array} Array of connection objects or empty array if none found
 */
export const getConnections = () => {
    try {
        const data = localStorage.getItem(CONNECTIONS_KEY);
        if (!data) return [];

        const connections = JSON.parse(data);
        console.log(`Retrieved ${connections.length} connections from localStorage`);
        return Array.isArray(connections) ? connections : [];
    } catch (error) {
        console.error('Error retrieving connections from localStorage:', error);
        return [];
    }
};

/**
 * Clear all stored data
 */
export const clearStorage = () => {
    try {
        localStorage.removeItem(COMPONENTS_KEY);
        localStorage.removeItem(CONNECTIONS_KEY);
        console.log('Cleared all storage data');
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
};

// Create debounced versions of storage functions to prevent excessive writes
export const debouncedSaveComponents = debounce(saveComponents, 500);
export const debouncedSaveConnections = debounce(saveConnections, 500);