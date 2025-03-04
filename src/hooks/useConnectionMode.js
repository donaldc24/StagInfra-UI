// src/hooks/useConnectionMode.js
import { useState, useCallback } from 'react';
import { setLineMode, setLineStart } from '../store/slices/uiStateSlice';
import { addConnection } from '../store/slices/connectionsSlice';
import { validateConnection } from '../services/aws/connectionValidator';

const useConnectionMode = (
    stageRef,
    components,
    connections,
    dispatch,
    showNotification
) => {
    const [ghostLine, setGhostLine] = useState(null);
    const [connectionStartComponent, setConnectionStartComponent] = useState(null);

    const startConnection = useCallback((sourceComponent) => {
        if (!sourceComponent) return;

        // Set starting point for connection
        setConnectionStartComponent(sourceComponent);
        dispatch(setLineStart(sourceComponent));

        // Create initial ghost line from component center
        const sourceX = sourceComponent.x + (sourceComponent.width || 40) / 2;
        const sourceY = sourceComponent.y + (sourceComponent.height || 40) / 2;

        setGhostLine({
            points: [sourceX, sourceY, sourceX, sourceY]
        });

        // Notify user about connection mode
        showNotification(
            `Select a target to connect from ${sourceComponent.type}`,
            'info'
        );
    }, [dispatch, showNotification]);

    const updateGhostLine = useCallback((e) => {
        if (!ghostLine || !connectionStartComponent) return;

        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();

        // Adjust for stage scaling and position
        const sourceX = ghostLine.points[0];
        const sourceY = ghostLine.points[1];

        setGhostLine({
            points: [
                sourceX,
                sourceY,
                (pointerPosition.x - stage.x()) / stage.scaleX(),
                (pointerPosition.y - stage.y()) / stage.scaleY()
            ]
        });
    }, [ghostLine, connectionStartComponent]);

    const completeConnection = useCallback((targetComponent) => {
        if (!connectionStartComponent || !targetComponent) {
            cancelConnection();
            return false;
        }

        // Validate connection
        const validationResult = validateConnection(
            connectionStartComponent,
            targetComponent,
            components,
            connections
        );

        if (validationResult.valid) {
            // Create connection
            const connectionId = `${connectionStartComponent.id}-${targetComponent.id}`;
            dispatch(addConnection({
                id: connectionId,
                from: connectionStartComponent.id,
                to: targetComponent.id
            }));

            // Show success notification with connection type description
            showNotification(
                validationResult.message,
                'success'
            );

            cancelConnection();
            return true;
        } else {
            // Show error notification
            showNotification(
                validationResult.message,
                'error'
            );

            return false;
        }
    }, [
        connectionStartComponent,
        dispatch,
        components,
        connections,
        showNotification
    ]);

    const cancelConnection = useCallback(() => {
        // Reset all connection-related states
        setConnectionStartComponent(null);
        setGhostLine(null);
        dispatch(setLineStart(null));
        dispatch(setLineMode(false));
    }, [dispatch]);

    return {
        ghostLine,
        connectionStartComponent,
        startConnection,
        updateGhostLine,
        completeConnection,
        cancelConnection
    };
};

export default useConnectionMode;