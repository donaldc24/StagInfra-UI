// src/store/slices/systemSlice.js
import { createSlice } from '@reduxjs/toolkit';

const systemSlice = createSlice({
    name: 'system',
    initialState: {
        backendStatus: 'Checking...',
        notifications: []
    },
    reducers: {
        setBackendStatus: (state, action) => {
            state.backendStatus = action.payload;
        },
        addNotification: (state, action) => {
            state.notifications.push({
                id: Date.now(),
                ...action.payload
            });
        },
        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(
                notification => notification.id !== action.payload
            );
        }
    }
});

export const { setBackendStatus, addNotification, removeNotification } = systemSlice.actions;

export default systemSlice.reducer;