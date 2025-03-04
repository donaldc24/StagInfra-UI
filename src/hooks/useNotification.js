// src/hooks/useNotification.js
import { useState, useCallback } from 'react';

const useNotification = () => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'info') => {
        const id = Date.now();

        // Create new notification
        const newNotification = { id, message, type };

        // Update notifications, limiting to 3 total
        setNotifications(prev => {
            // Create a new array with the new notification
            const updatedNotifications = [...prev, newNotification];

            // If more than 3 notifications, remove the oldest overall
            return updatedNotifications.slice(-3);
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev =>
                prev.filter(n => n.id !== id)
            );
        }, 5000);

        return id; // Return notification ID in case you want to manually dismiss
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const dismissNotification = useCallback((id) => {
        setNotifications(prev =>
            prev.filter(notification => notification.id !== id)
        );
    }, []);

    return {
        notifications,
        showNotification,
        clearNotifications,
        dismissNotification
    };
};

export default useNotification;