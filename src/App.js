// src/App.js - Updated with Authentication routes
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import CloudArchitectureDesigner from './components/CloudArchitectureDesigner';
import RegistrationForm from './components/auth/RegistrationForm';
import RegistrationSuccess from './components/auth/RegistrationSuccess';
import EmailVerification from './components/auth/EmailVerification';
import LoginForm from './components/auth/LoginForm';
import Navbar from './components/shared/Navbar';
import UserVerificationDashboard from './components/admin/UserVerificationDashboard';
import { setBackendStatus } from './store/slices/systemSlice';
import { loadComponents } from './store/slices/componentsSlice';
import { loadConnections } from './store/slices/connectionsSlice';
import { getComponents, getConnections } from './services/utils/storageService';
import { authService } from './services/authService';
import './styles/layout.css';
import './styles/utilities.css';
import './styles/auth.css';

// Protected route component
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = authService.isAuthenticated();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    const dispatch = useDispatch();

    // Initial setup
    useEffect(() => {
        console.log('Initializing application and loading saved state');

        // Always load saved components
        const savedComponents = getComponents();
        console.log('Found saved components:', savedComponents.length);
        if (savedComponents.length > 0) {
            dispatch(loadComponents(savedComponents));
        }

        // Always load saved connections
        const savedConnections = getConnections();
        console.log('Found saved connections:', savedConnections.length);
        if (savedConnections.length > 0) {
            dispatch(loadConnections(savedConnections));
        }

        // Check backend connection
        const checkBackend = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/health');
                const data = await response.json();
                dispatch(setBackendStatus(data.status === 'OK' ? 'connected' : 'disconnected'));
            } catch (error) {
                console.error('Error connecting to backend:', error);
                dispatch(setBackendStatus('disconnected'));
            }
        };

        checkBackend();
    }, [dispatch]);

    return (
        <Router>
            {/* Main layout with navbar for most routes */}
            <Routes>
                <Route path="/admin/users" element={
                    <ProtectedRoute>
                        <Navbar />
                        <UserVerificationDashboard />
                    </ProtectedRoute>
                } />
                {/* Auth routes - no navbar for clean layout */}
                <Route path="/register" element={<RegistrationForm />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/registration-success" element={<RegistrationSuccess />} />
                <Route path="/verify-email" element={<EmailVerification />} />

                {/* Routes with navbar */}
                <Route path="/" element={
                    <>
                        <Navbar />
                        <CloudArchitectureDesigner />
                    </>
                } />

                <Route path="/designer" element={
                    <ProtectedRoute>
                        <Navbar />
                        <CloudArchitectureDesigner />
                    </ProtectedRoute>
                } />

                {/* Redirect all other routes to home */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;