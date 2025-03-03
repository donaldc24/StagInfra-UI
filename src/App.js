// src/App.js
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import CloudArchitectureDesigner from './components/CloudArchitectureDesigner';
import { setBackendStatus } from './store/slices/systemSlice';
import { loadComponents } from './store/slices/componentsSlice';
import { loadConnections } from './store/slices/connectionsSlice';
import { getComponents, getConnections } from './services/storageService';
import './styles/App.css';
import './styles/enhanced-ui.css';

function App() {
    const dispatch = useDispatch();

    // Initial setup
    useEffect(() => {
        // Load saved components
        const savedComponents = getComponents();
        if (savedComponents.length > 0) {
            dispatch(loadComponents(savedComponents));
        }

        // Load saved connections
        const savedConnections = getConnections();
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
        <div className="app">
            <CloudArchitectureDesigner />
        </div>
    );
}

export default App;