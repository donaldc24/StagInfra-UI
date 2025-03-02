// src/store/slices/uiStateSlice.js
import { createSlice } from '@reduxjs/toolkit';

const uiStateSlice = createSlice({
    name: 'uiState',
    initialState: {
        isLineMode: false,
        lineStart: null,
        activeTab: 'add',
        renameModalOpen: false,
        selectedComponent: null,
    },
    reducers: {
        setLineMode: (state, action) => {
            state.isLineMode = action.payload;
            // If turning off line mode, clear lineStart
            if (!action.payload) {
                state.lineStart = null;
            }
        },
        setLineStart: (state, action) => {
            state.lineStart = action.payload;
        },
        setActiveTab: (state, action) => {
            state.activeTab = action.payload;
        },
        openRenameModal: (state, action) => {
            state.renameModalOpen = true;
            state.selectedComponent = action.payload;
        },
        closeRenameModal: (state) => {
            state.renameModalOpen = false;
            state.selectedComponent = null;
        }
    }
});

export const {
    setLineMode,
    setLineStart,
    setActiveTab,
    openRenameModal,
    closeRenameModal
} = uiStateSlice.actions;

export default uiStateSlice.reducer;