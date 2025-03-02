// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import connectionsReducer from './slices/connectionsSlice';
import uiStateReducer from './slices/uiStateSlice';
import costReducer from './slices/costSlice';
import systemReducer from './slices/systemSlice';
import componentsReducer from './slices/componentsSlice';

export const store = configureStore({
    reducer: {
        components: componentsReducer,
        connections: connectionsReducer,
        uiState: uiStateReducer,
        cost: costReducer,
        system: systemReducer
    }
});