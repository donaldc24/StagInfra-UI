import { createSlice } from '@reduxjs/toolkit';
import { getComponentMetadata } from '../../services/aws';
import { saveComponents, debouncedSaveComponents } from '../../services/utils/storageService';

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
                // Set default dimensions based on component type
                const metadata = getComponentMetadata(action.payload.type);
                if (metadata) {
                    // Apply container-specific defaults if it's a container
                    if (metadata.isContainer) {
                        action.payload.width = action.payload.width || metadata.size?.width || 300;
                        action.payload.height = action.payload.height || metadata.size?.height || 200;
                    }
                }

                state.list.push(action.payload);
                console.log('Component added:', action.payload.id);

                // Save to localStorage
                debouncedSaveComponents(state.list);
            }
        },
        updateComponent: (state, action) => {
            const { id, changes } = action.payload;
            const component = state.list.find(comp => comp.id === id);
            if (component) {
                Object.assign(component, changes);
                console.log('Component updated:', id);

                // Save to localStorage
                debouncedSaveComponents(state.list);
            }
        },
        updateComponentsFromStorage: (state, action) => {
            const { id, field, value } = action.payload;
            const component = state.list.find(comp => comp.id === id);
            if (component) {
                component[field] = value;
                console.log(`Component ${id} field ${field} updated to:`, value);

                // Save to localStorage
                debouncedSaveComponents(state.list);
            }
        },
        removeComponent: (state, action) => {
            // Remove the component
            state.list = state.list.filter(comp => comp.id !== action.payload);

            // Also clear container references if this was a container
            state.list.forEach(comp => {
                if (comp.containerId === action.payload) {
                    comp.containerId = null;
                }
            });

            console.log('Component removed:', action.payload);

            // Save to localStorage
            debouncedSaveComponents(state.list);
        },
        updateComponentPosition: (state, action) => {
            const { id, position, containerId } = action.payload;

            const component = state.list.find(comp => comp.id === id);
            if (component) {
                // Update position (which is now relative to container if containerId exists)
                component.x = position.x;
                component.y = position.y;

                // Only update containerId if it was explicitly provided
                if (containerId !== undefined) {
                    // Update or remove the container relationship
                    component.containerId = containerId;
                    console.log(`Component ${id} container updated to:`, containerId);
                }

                console.log(`Component ${id} position updated to (${position.x}, ${position.y})`);

                // Save to localStorage
                debouncedSaveComponents(state.list);
            } else {
                console.warn(`updateComponentPosition: Component with ID ${id} not found`);
            }
        },
        moveContainerAndContents: (state, action) => {
            const { containerId, dx, dy } = action.payload;

            // Find the container
            const container = state.list.find(comp => comp.id === containerId);
            if (!container) return;

            // Update container position (absolute coordinates)
            container.x += dx;
            container.y += dy;

            // No need to update relative positions of contained components
            // They maintain their relative positions automatically

            console.log(`Container ${containerId} and contents moved by (${dx}, ${dy})`);

            // Save to localStorage
            debouncedSaveComponents(state.list);
        },
        setDraggingComponent: (state, action) => {
            state.draggingComponent = action.payload;
        },
        setGhostLine: (state, action) => {
            state.ghostLine = action.payload;
        },
        resizeContainer: (state, action) => {
            const { id, width, height } = action.payload;
            const container = state.list.find(comp => comp.id === id);

            if (container) {
                // Validate the component is a container
                const metadata = getComponentMetadata(container.type);
                if (metadata && metadata.isContainer) {
                    container.width = width;
                    container.height = height;
                    console.log(`Container ${id} resized to ${width}x${height}`);

                    // Save to localStorage
                    debouncedSaveComponents(state.list);
                }
            }
        },
        moveContainedComponents: (state, action) => {
            const { containerId, dx, dy } = action.payload;

            // This shouldn't be necessary anymore with proper relative positioning
            // but we'll keep it as a fallback

            // Move all components that are in this container
            state.list.forEach(component => {
                if (component.containerId === containerId) {
                    // We don't need to update positions of contained components
                    // since they're already in relative coordinates
                }
            });

            console.log(`Maintained relative positions of components in container ${containerId}`);

            // Save to localStorage
            debouncedSaveComponents(state.list);
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
    moveContainerAndContents,
    setDraggingComponent,
    setGhostLine,
    resizeContainer,
    moveContainedComponents
} = componentsSlice.actions;

// Selectors
export const selectComponents = state => state.components.list;
export const selectDraggingComponent = state => state.components.draggingComponent;
export const selectGhostLine = state => state.components.ghostLine;

export default componentsSlice.reducer;