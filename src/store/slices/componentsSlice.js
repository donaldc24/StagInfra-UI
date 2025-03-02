// src/store/slices/componentsSlice.js
import { createSlice } from '@reduxjs/toolkit';

// Define initial state as an object with a components array and UI state
const componentsSlice = createSlice({
    name: 'components',
    initialState: {
        list: [], // Array of components
        draggingComponent: null,
        ghostLine: null
    },
    reducers: {
        loadComponents: (state, action) => {
            state.list = action.payload;
        },
        addComponent: (state, action) => {
            state.list.push(action.payload);
        },
        updateComponent: (state, action) => {
            const { id, changes } = action.payload;
            const component = state.list.find(comp => comp.id === id);
            if (component) {
                Object.assign(component, changes);
            }
        },
        updateComponentsFromStorage: (state, action) => {
            const { id, field, value } = action.payload;
            const component = state.list.find(comp => comp.id === id);
            if (component) {
                component[field] = value;
            }
        },
        removeComponent: (state, action) => {
            state.list = state.list.filter(comp => comp.id !== action.payload);
        },
        updateComponentPosition: (state, action) => {
            const { id, position, delete: shouldDelete } = action.payload;

            if (shouldDelete) {
                state.list = state.list.filter(comp => comp.id !== id);
                return;
            }

            const component = state.list.find(comp => comp.id === id);
            if (component) {
                component.x = position.x;
                component.y = position.y;
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