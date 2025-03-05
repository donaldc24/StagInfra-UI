// src/components/auth/UserSessions.js
import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import '../../styles/auth.css';

const UserSessions = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmLogout, setConfirmLogout] = useState(false);

    useEffect(() => {
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
            navigate('/login');
            return;
        }

        // Fetch active sessions
        const fetchSessions = async () => {
            try {
                setIsLoading(true);
                const activeSessions = await authService.getActiveSessions();
                setSessions(activeSessions);
                setError(null);
            } catch (error) {
                console.error('Error fetching sessions:', error);
                setError('Failed to load active sessions. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSessions();
    }, [navigate]);

    const handleLogoutDevice = async (sessionToken) => {
        try {
            const success = await authService.logoutDevice(sessionToken);

            if (success) {
                // Update sessions list
                setSessions(sessions.filter(session => session.token !== sessionToken));
            } else {
                setError('Failed to logout device. Please try again.');
            }
        } catch (error) {
            console.error('Error logging out device:', error);
            setError('An error occurred while logging out device.');
        }
    };

    const handleLogoutAllDevices = async () => {
        try {
            const success = await authService.logoutAllDevices();

            if (success) {
                // Redirect to login page
                navigate('/login');
            } else {
                setError('Failed to logout all devices. Please try again.');
            }
        } catch (error) {
            console.error('Error logging out all devices:', error);
            setError('An error occurred while logging out all devices.');
        }
    };

    if (isLoading) {
        return (
            <div className="auth-container">
                <div className="auth-form-container">
                    <h2>Active Sessions</h2>
                    <div className="loading-indicator">Loading active sessions...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-form-container">
                <h2>Active Sessions</h2>

                {error && (
                    <div className="error-message server-error">
                        {error}
                    </div>
                )}

                <div className="sessions-list">
                    {sessions.length === 0 ? (
                        <p className="no-sessions-message">No active sessions found.</p>
                    ) : (
                        <div>
                            <p className="sessions-info">These are your currently active login sessions across all devices.</p>

                            {sessions.map((session, index) => (
                                <div key={index} className={`session-item ${session.isCurrent ? 'current-session' : ''}`}>
                                    <div className="session-info">
                                        <div className="session-device">
                                            {session.isCurrent ? 'Current Device' : 'Other Device'}
                                        </div>
                                        <div className="session-time">
                                            Login: {new Date(session.issuedAt).toLocaleString()}
                                        </div>
                                        <div className="session-expiry">
                                            Expires: {new Date(session.expiration).toLocaleString()}
                                        </div>
                                    </div>

                                    {!session.isCurrent && (
                                        <button
                                            className="logout-button session-logout-button"
                                            onClick={() => handleLogoutDevice(session.token)}
                                        >
                                            Logout
                                        </button>
                                    )}
                                </div>
                            ))}

                            <div className="logout-all-section">
                                {!confirmLogout ? (
                                    <button
                                        className="logout-all-button"
                                        onClick={() => setConfirmLogout(true)}
                                    >
                                        Logout from All Devices
                                    </button>
                                ) : (
                                    <div className="logout-confirm">
                                        <p>Are you sure you want to logout from all devices?</p>
                                        <div className="confirm-buttons">
                                            <button
                                                className="confirm-button confirm-yes"
                                                onClick={handleLogoutAllDevices}
                                            >
                                                Yes, Logout All
                                            </button>
                                            <button
                                                className="confirm-button confirm-no"
                                                onClick={() => setConfirmLogout(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserSessions;