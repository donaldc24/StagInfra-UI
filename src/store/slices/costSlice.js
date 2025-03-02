// src/store/slices/costSlice.js
import { createSlice } from '@reduxjs/toolkit';

const costSlice = createSlice({
    name: 'cost',
    initialState: {
        total: 0,
        breakdown: {},
        isLoading: false,
        error: null
    },
    reducers: {
        updateCost: (state, action) => {
            state.total = action.payload;
        },
        setCostBreakdown: (state, action) => {
            state.breakdown = action.payload;
        },
        setCostLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setCostError: (state, action) => {
            state.error = action.payload;
        }
    }
});

export const { updateCost, setCostBreakdown, setCostLoading, setCostError } = costSlice.actions;

export default costSlice.reducer;