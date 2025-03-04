// src/store/slices/componentsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const componentsSlice = createSlice({
    name: 'components',
    initialState: {
        list: [], // Array of components
        draggingComponent: null,
        ghostLine: null
    },
    reducers: {
        loadComponents: (state, action) => {
            // Replace the entire component list with the loaded data
            if (Array.isArray(action.payload)) {
                state.list = action.payload;
                console.log('Components loaded into Redux:', action.payload.length);
            }
        },
        addComponent: (state, action) => {
            // Only add valid components
            if (action.payload && action.payload.id && action.payload.type) {
                state.list.push(action.payload);
                console.log('Component added:', action.payload.id);
            }
        },
        updateComponent: (state, action) => {
            const { id, changes } = action.payload;
            const component = state.list.find(comp => comp.id === id);
            if (component) {
                Object.assign(component, changes);
                console.log('Component updated:', id);
            }
        },
        updateComponentsFromStorage: (state, action) => {
            const { id, field, value } = action.payload;
            const component = state.list.find(comp => comp.id === id);
            if (component) {
                component[field] = value;
                console.log(`Component ${id} field ${field} updated to:`, value);
            }
        },
        removeComponent: (state, action) => {
            state.list = state.list.filter(comp => comp.id !== action.payload);
            console.log('Component removed:', action.payload);
        },
        updateComponentPosition: (state, action) => {
            const { id, position, delete: shouldDelete } = action.payload;

            if (shouldDelete) {
                state.list = state.list.filter(comp => comp.id !== id);
                console.log('Component deleted during position update:', id);
                return;
            }

            const component = state.list.find(comp => comp.id === id);
            if (component) {
                // Update the position properties directly
                component.x = position.x;
                component.y = position.y;
                console.log(`Component ${id} position updated to (${position.x}, ${position.y})`);
            } else {
                console.warn(`updateComponentPosition: Component with ID ${id} not found`);
            }
        },
        setDraggingComponent: (state, action) => {
            state.draggingComponent = action.payload;
        },
        setGhostLine: (state, action) => {
            state.ghostLine = action.payload;
        }
    }
});

export const {
    loadComponents,
    addComponent,
    updateComponent,
    updateComponentsFromStorage,
    removeComponent,
    updateComponentPosition,
    setDraggingComponent,
    setGhostLine
} = componentsSlice.actions;

// Selectors
export const selectComponents = state => state.components.list;
export const selectDraggingComponent = state => state.components.draggingComponent;
export const selectGhostLine = state => state.components.ghostLine;

export default componentsSlice.reducer;