// src/components/shared/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const Navbar = () => {
    const navigate = useNavigate();
    const isAuthenticated = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    return (
        <nav className="app-header">
            <div className="app-title">
                <Link to="/" className="logo-link">
                    Cloud Architecture Designer
                </Link>
            </div>

            <div className="nav-links">
                <Link to="/" className="nav-link">Home</Link>
                <Link to="/designer" className="nav-link">Designer</Link>
                {currentUser?.roles?.includes('ADMIN') && (
                    <Link to="/admin/users" className="nav-link">Admin</Link>
                )}
            </div>

            <div className="auth-controls">
                {isAuthenticated ? (
                    <>
                        <div className="user-info">
                            <span className="welcome-text">
                                Welcome, {currentUser?.firstName || 'User'}
                            </span>
                        </div>
                        <button onClick={handleLogout} className="logout-button">
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="login-link">Login</Link>
                        <Link to="/register" className="register-button">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;