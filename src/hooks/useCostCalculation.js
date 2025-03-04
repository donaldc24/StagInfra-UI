// src/hooks/useCostCalculation.js
import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';
import { calculateCost, estimateCostLocally } from '../services/utils/costCalculationService';
import { updateCost } from '../store/slices/costSlice';

/**
 * Custom hook to handle cost calculation when components change
 */
const useCostCalculation = () => {
    const dispatch = useDispatch();
    const components = useSelector(state => state.components.list);
    const backendStatus = useSelector(state => state.system?.backendStatus || 'disconnected');
    const totalCost = useSelector(state => state.cost?.total || 0);

    // Create a debounced version of the cost calculation to avoid too many API calls
    const debouncedCalculateCost = useCallback(
        debounce(async (comps) => {
            if (backendStatus === 'connected') {
                await calculateCost(comps, dispatch);
            } else {
                // If backend is not available, use local estimation
                const estimatedCost = estimateCostLocally(comps);
                dispatch(updateCost(estimatedCost));
            }
        }, 500),
        [backendStatus, dispatch]
    );

    // Recalculate cost whenever component list changes
    useEffect(() => {
        if (components.length > 0) {
            debouncedCalculateCost(components);
        } else {
            // If there are no components, set cost to 0
            dispatch(updateCost(0));
        }

        // Cleanup the debounced function
        return () => debouncedCalculateCost.cancel();
    }, [components, debouncedCalculateCost, dispatch]);

    // Force an immediate cost calculation
    const refreshCost = useCallback(() => {
        if (components.length > 0) {
            debouncedCalculateCost.cancel(); // Cancel any pending calculations

            if (backendStatus === 'connected') {
                calculateCost(components, dispatch);
            } else {
                const estimatedCost = estimateCostLocally(components);
                dispatch(updateCost(estimatedCost));
            }
        }
    }, [components, backendStatus, dispatch, debouncedCalculateCost]);

    return {
        totalCost,
        refreshCost
    };
};

export default useCostCalculation;