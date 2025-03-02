// src/store/slices/connectionsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const connectionsSlice = createSlice({
    name: 'connections',
    initialState: [],
    reducers: {
        loadConnections: (state, action) => {
            return action.payload;
        },
        addConnection: (state, action) => {
            const { from, to } = action.payload;
            // Check if connection already exists
            const exists = state.some(conn =>
                conn.from === from && conn.to === to ||
                conn.from === to && conn.to === from
            );

            if (!exists) {
                state.push(action.payload);
                // Update localStorage
                localStorage.setItem('connections', JSON.stringify([...state]));
            }
        },
        removeConnection: (state, action) => {
            const { from, to } = action.payload;
            const filtered = state.filter(conn => !(conn.from === from && conn.to === to));
            localStorage.setItem('connections', JSON.stringify(filtered));
            return filtered;
        },
        clearConnections: () => {
            localStorage.removeItem('connections');
            return [];
        },
        // Remove connections when a component is deleted
        removeComponentConnections: (state, action) => {
            const componentId = action.payload;
            const filtered = state.filter(conn =>
                conn.from !== componentId && conn.to !== componentId
            );
            localStorage.setItem('connections', JSON.stringify(filtered));
            return filtered;
        }
    }
});

export const {
    loadConnections,
    addConnection,
    removeConnection,
    clearConnections,
    removeComponentConnections
} = connectionsSlice.actions;

export default connectionsSlice.reducer;