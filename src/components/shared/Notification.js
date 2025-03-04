// src/components/shared/Notification.js
import React from 'react';
import { X, Info, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Notification component to display alerts and messages
 *
 * @param {Object} props
 * @param {Array} props.notifications - Array of notification objects
 * @param {Function} props.onDismiss - Function to dismiss a notification
 */
const Notification = ({ notifications = [], onDismiss }) => {
    if (!notifications || notifications.length === 0) return null;

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="notification-icon" size={20} />;
            case 'error':
                return <AlertCircle className="notification-icon" size={20} />;
            case 'info':
            default:
                return <Info className="notification-icon" size={20} />;
        }
    };

    return (
        <div className="notification-container">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`notification notification-${notification.type || 'info'}`}
                >
                    <div className="notification-content">
                        {getNotificationIcon(notification.type)}
                        <p className="notification-message">{notification.message}</p>
                        <button
                            className="notification-close"
                            onClick={() => onDismiss && onDismiss(notification.id)}
                            aria-label="Close notification"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Individual notification item component
 * Can be used standalone if needed
 */
export const NotificationItem = ({ id, type = 'info', message, onDismiss }) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="notification-icon" size={20} />;
            case 'error':
                return <AlertCircle className="notification-icon" size={20} />;
            case 'info':
            default:
                return <Info className="notification-icon" size={20} />;
        }
    };

    return (
        <div className={`notification notification-${type}`}>
            <div className="notification-content">
                {getIcon()}
                <p className="notification-message">{message}</p>
                {onDismiss && (
                    <button
                        className="notification-close"
                        onClick={() => onDismiss(id)}
                        aria-label="Close notification"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Notification;