// src/hooks/useConnectionMode.js
import { useState, useCallback } from 'react';
import { setLineMode, setLineStart } from '../store/slices/uiStateSlice';
import { addConnection } from '../store/slices/connectionsSlice';
import { validateConnection } from '../services/hierarchicalConnectionValidator';

/**
 * Custom hook to manage the connection mode functionality
 *
 * @param {React.RefObject} stageRef - Reference to the Konva Stage
 * @param {Array} components - List of canvas components
 * @param {Array} connections - List of existing connections
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} showNotification - Function to show notifications
 * @returns {Object} Connection mode methods and state
 */
const useConnectionMode = (stageRef, components, connections, dispatch, showNotification) => {
    // Local state
    const [ghostLine, setGhostLine] = useState(null);

    /**
     * Start connection from a source component
     * @param {Object} sourceComponent - The source component to start from
     */
    const handleConnectionStart = useCallback((sourceComponent) => {
        if (!sourceComponent) return;

        dispatch(setLineStart(sourceComponent));

        // Initialize ghost line at the center of the source component
        const sourceX = sourceComponent.x + (sourceComponent.width || 40) / 2;
        const sourceY = sourceComponent.y + (sourceComponent.height || 40) / 2;

        setGhostLine({
            points: [sourceX, sourceY, sourceX, sourceY]
        });

        // Show which components can connect to this one
        // This could be enhanced with a visual indication on components
        showNotification && showNotification(
            `Select a target to connect from ${sourceComponent.name || sourceComponent.type}`,
            'info'
        );
    }, [dispatch, showNotification]);

    /**
     * Update ghost line during mouse movement
     * @param {Event} e - The mouse move event
     */
    const handleConnectionMove = useCallback((e) => {
        if (!ghostLine) return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        const sourceX = ghostLine.points[0];
        const sourceY = ghostLine.points[1];

        setGhostLine({
            points: [sourceX, sourceY, pointerPosition.x, pointerPosition.y]
        });
    }, [ghostLine]);

    /**
     * Complete the connection to a target component
     * @param {Object} targetComponent - The target component to connect to
     */
    const handleConnectionComplete = useCallback((targetComponent) => {
        // Get the source component from Redux state (lineStart)
        // This is passed in from the parent component
        const sourceComponent = components.find(c => c.id === stageRef.current.attrs.lineStartId);

        if (!sourceComponent || !targetComponent) {
            handleConnectionCancel();
            return;
        }

        // Validate the connection
        const validationResult = validateConnection(
            sourceComponent,
            targetComponent,
            components,
            connections
        );

        if (validationResult.valid) {
            // Create the connection
            const newConnection = {
                id: `${sourceComponent.id}-${targetComponent.id}`,
                from: sourceComponent.id,
                to: targetComponent.id
            };

            dispatch(addConnection(newConnection));
            showNotification && showNotification(
                `Connected ${sourceComponent.name || sourceComponent.type} to ${targetComponent.name || targetComponent.type}`,
                'success'
            );
        } else {
            // Show validation error
            showNotification && showNotification(
                validationResult.message,
                'error'
            );
        }

        // Reset connection mode
        dispatch(setLineStart(null));
        dispatch(setLineMode(false));
        setGhostLine(null);
    }, [dispatch, components, connections, stageRef, showNotification]);

    /**
     * Cancel the current connection attempt
     */
    const handleConnectionCancel = useCallback(() => {
        dispatch(setLineStart(null));
        setGhostLine(null);

        showNotification && showNotification(
            'Connection cancelled',
            'info'
        );
    }, [dispatch, showNotification]);

    /**
     * Toggle connection mode on/off
     */
    const toggleConnectionMode = useCallback(() => {
        dispatch(setLineMode(prev => {
            const newState = !prev;

            // Reset if turning off
            if (!newState) {
                dispatch(setLineStart(null));
                setGhostLine(null);
            }

            showNotification && showNotification(
                newState ? 'Connection mode activated' : 'Connection mode deactivated',
                'info'
            );

            return newState;
        }));
    }, [dispatch, showNotification]);

    /**
     * Check if a target component is valid for connection
     * @param {Object} sourceComponent - The source component
     * @param {Object} targetComponent - The potential target component
     * @returns {boolean} - Whether the connection would be valid
     */
    const isValidConnectionTarget = useCallback((sourceComponent, targetComponent) => {
        if (!sourceComponent || !targetComponent || sourceComponent.id === targetComponent.id) {
            return false;
        }

        const validation = validateConnection(
            sourceComponent,
            targetComponent,
            components,
            connections
        );

        return validation.valid;
    }, [components, connections]);

    return {
        ghostLine,
        handleConnectionStart,
        handleConnectionMove,
        handleConnectionComplete,
        handleConnectionCancel,
        toggleConnectionMode,
        isValidConnectionTarget
    };
};

export default useConnectionMode;