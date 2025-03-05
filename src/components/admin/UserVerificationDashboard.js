// src/components/admin/UserVerificationDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import httpClient from '../../services/httpClient';
import { authService } from '../../services/authService';
import '../../styles/admin.css';

const UserVerificationDashboard = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Add this to handle 403 errors
    useEffect(() => {
        // Check if user is admin (this is a simplified check - you would have a better mechanism)
        const currentUser = authService.getCurrentUser();
        if (!currentUser || !currentUser.roles?.includes('ADMIN')) {
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setIsLoading(true);
                const response = await httpClient.get('/admin/users');
                setUsers(response.data);
                setError(null);
            } catch (error) {
                console.error('Error fetching users:', error);
                setError('Failed to load users. You may not have admin permissions.');
                if (error.response?.status === 403) {
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [navigate]);

    const handleVerifyUser = async (userId) => {
        try {
            const response = await httpClient.post(`/admin/users/${userId}/verify`);

            // Update the user in our local state
            setUsers(users.map(user =>
                user.id === userId ? response.data : user
            ));

        } catch (error) {
            console.error('Error verifying user:', error);
            setError('Failed to verify user.');
        }
    };

    const handleMakeAdmin = async (userId) => {
        try {
            const response = await httpClient.post(`/admin/users/${userId}/admin`);

            // Update the user in our local state
            setUsers(users.map(user =>
                user.id === userId ? response.data : user
            ));

        } catch (error) {
            console.error('Error making user admin:', error);
            setError('Failed to grant admin role to user.');
        }
    };

    if (isLoading) {
        return (
            <div className="admin-container">
                <div className="loading-indicator">Loading users...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-container">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <h1>User Verification Dashboard</h1>

            <div className="admin-stats">
                <div className="stat-card">
                    <h3>Total Users</h3>
                    <div className="stat-value">{users.length}</div>
                </div>
                <div className="stat-card">
                    <h3>Verified Users</h3>
                    <div className="stat-value">
                        {users.filter(user => user.emailVerified).length}
                    </div>
                </div>
                <div className="stat-card">
                    <h3>Pending Verification</h3>
                    <div className="stat-value">
                        {users.filter(user => !user.emailVerified).length}
                    </div>
                </div>
            </div>

            <div className="user-table-container">
                <table className="user-table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Verification Status</th>
                        <th>Company</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {users.map(user => (
                        <tr key={user.id} className={user.emailVerified ? 'verified' : 'unverified'}>
                            <td>{user.id}</td>
                            <td>{user.firstName} {user.lastName}</td>
                            <td>{user.email}</td>
                            <td>
                                    <span className={`status-badge ${user.emailVerified ? 'verified' : 'unverified'}`}>
                                        {user.emailVerified ? 'Verified' : 'Unverified'}
                                    </span>
                            </td>
                            <td>{user.company || '-'}</td>
                            <td>
                                {!user.emailVerified && (
                                    <button
                                        onClick={() => handleVerifyUser(user.id)}
                                        className="verify-button"
                                    >
                                        Verify User
                                    </button>
                                )}
                                {user.emailVerified && !user.roles?.includes('ADMIN') && (
                                    <button
                                        onClick={() => handleMakeAdmin(user.id)}
                                        className="admin-button"
                                    >
                                        Make Admin
                                    </button>
                                )}
                                {user.roles?.includes('ADMIN') && (
                                    <span className="admin-badge">Admin</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan="6" className="no-users-message">
                                No users found in the system.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserVerificationDashboard;