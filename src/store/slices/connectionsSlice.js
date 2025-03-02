// src/store/slices/connectionsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const connectionsSlice = createSlice({
    name: 'connections',
    initialState: [],
    reducers: {
        loadConnections: (state, action) => {
            // Replace the entire connections array with the loaded data
            if (Array.isArray(action.payload)) {
                console.log('Connections loaded into Redux:', action.payload.length);
                return action.payload;
            }
            return state;
        },
        addConnection: (state, action) => {
            const { id, from, to } = action.payload;

            if (!id || !from || !to) {
                console.warn('Invalid connection data:', action.payload);
                return state;
            }

            // Check if connection already exists
            const exists = state.some(conn =>
                (conn.from === from && conn.to === to) ||
                (conn.from === to && conn.to === from) ||
                conn.id === id
            );

            if (!exists) {
                console.log('Connection added:', id || `${from}-${to}`);
                state.push(action.payload);
            } else {
                console.log('Connection already exists');
            }

            return state;
        },
        removeConnection: (state, action) => {
            // Handle both connection object and string ID
            let filteredState;

            if (typeof action.payload === 'string') {
                // If we were passed just the id
                filteredState = state.filter(conn => conn.id !== action.payload);
                console.log('Connection removed by ID:', action.payload);
            } else if (action.payload && action.payload.from && action.payload.to) {
                // If we were passed a connection object
                const { from, to } = action.payload;
                filteredState = state.filter(conn => !(conn.from === from && conn.to === to));
                console.log('Connection removed:', `${from}-${to}`);
            } else {
                console.warn('Invalid connection removal data:', action.payload);
                return state;
            }

            return filteredState;
        },
        clearConnections: (state) => {
            console.log('All connections cleared');
            return [];
        },
        // Remove connections when a component is deleted
        removeComponentConnections: (state, action) => {
            const componentId = action.payload;
            const filteredState = state.filter(conn =>
                conn.from !== componentId && conn.to !== componentId
            );

            console.log('Removed connections for component:', componentId);
            return filteredState;
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