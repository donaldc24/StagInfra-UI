// src/store/middleware/storageMiddleware.js
import { saveComponents, saveConnections } from '../../services/utils/storageService';

const storageMiddleware = store => next => action => {
    const result = next(action);

    // Handle component-related actions
    if (
        action.type.startsWith('components/add') ||
        action.type.startsWith('components/update') ||
        action.type.startsWith('components/remove') ||
        action.type.startsWith('components/resize') ||
        action.type.startsWith('components/move')
    ) {
        // Save all components after any components-related action
        const state = store.getState();
        saveComponents(state.components.list);
    }

    // Handle connection-related actions
    if (
        action.type.startsWith('connections/add') ||
        action.type.startsWith('connections/remove') ||
        action.type.startsWith('connections/clear')
    ) {
        // Save all connections after any connections-related action
        const state = store.getState();
        saveConnections(state.connections);
    }

    return result;
};

export default storageMiddleware;