// src/hooks/useDebouncedUpdate.js
import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for debounced updates
 * Useful for property editing that needs to be responsive while minimizing Redux updates
 *
 * @param {Function} updateFunction - The function to call with debounced updates
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} - Function to call with updates
 */
const useDebouncedUpdate = (updateFunction, delay = 300) => {
    const timeoutRef = useRef(null);
    const [pendingUpdates, setPendingUpdates] = useState({});
    const [hasPendingUpdates, setHasPendingUpdates] = useState(false);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Process pending updates when they change
    useEffect(() => {
        if (hasPendingUpdates) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                // Get all pending updates
                Object.entries(pendingUpdates).forEach(([id, properties]) => {
                    Object.entries(properties).forEach(([property, value]) => {
                        updateFunction(id, property, value);
                    });
                });

                // Clear pending updates
                setPendingUpdates({});
                setHasPendingUpdates(false);
            }, delay);
        }
    }, [pendingUpdates, hasPendingUpdates, updateFunction, delay]);

    // Function to queue an update
    const queueUpdate = (id, property, value) => {
        setPendingUpdates(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [property]: value
            }
        }));
        setHasPendingUpdates(true);
    };

    return queueUpdate;
};

export default useDebouncedUpdate;