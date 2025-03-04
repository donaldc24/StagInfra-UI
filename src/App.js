// src/App.js
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import CloudArchitectureDesigner from './components/CloudArchitectureDesigner';
import { setBackendStatus } from './store/slices/systemSlice';
import { loadComponents } from './store/slices/componentsSlice';
import { loadConnections } from './store/slices/connectionsSlice';
import { getComponents, getConnections } from './services/utils/storageService';
import './styles/layout.css';
import './styles/utilities.css';

function App() {
    const dispatch = useDispatch();

    // Initial setup
    useEffect(() => {
        console.log('Initializing application and loading saved state');

        // Flag to prevent duplicate initialization
        const initialized = localStorage.getItem('staginfra_initialized');

        if (!initialized) {
            // Load saved components
            const savedComponents = getComponents();
            console.log('Found saved components:', savedComponents.length);
            if (savedComponents.length > 0) {
                dispatch(loadComponents(savedComponents));
            }

            // Load saved connections
            const savedConnections = getConnections();
            console.log('Found saved connections:', savedConnections.length);
            if (savedConnections.length > 0) {
                dispatch(loadConnections(savedConnections));
            }

            // Set initialization flag
            localStorage.setItem('staginfra_initialized', 'true');
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
        <div className="app">
            <CloudArchitectureDesigner />
        </div>
    );
}

export default App;