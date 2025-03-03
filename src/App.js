import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import HierarchicalCanvasContainer from './components/HierarchicalCanvasContainer';
import CostSummary from './components/CostSummary';
import GenerateTerraform from './components/GenerateTerraform';
import RenameModal from './components/RenameModal';
import { setBackendStatus } from './store/slices/systemSlice';
import { loadComponents, updateComponentsFromStorage, selectComponents } from './store/slices/componentsSlice';
import { loadConnections } from './store/slices/connectionsSlice';
import { updateCost } from './store/slices/costSlice';
import { closeRenameModal } from './store/slices/uiStateSlice';
import { getComponents, getConnections, saveComponents, saveConnections } from './services/storageService';
import './styles/App.css';

function App() {
    const dispatch = useDispatch();
    const backendStatus = useSelector(state => state.system.backendStatus);
    const canvasComponents = useSelector(selectComponents);
    const connections = useSelector(state => state.connections);
    const { renameModalOpen, selectedComponent } = useSelector(state => state.uiState);
    const totalCost = useSelector(state => state.cost.total);

    // On initial load - load saved data and check backend
    useEffect(() => {
        console.log('App mounted - initializing state');

        // Load saved components
        const savedComponents = getComponents();
        if (savedComponents.length > 0) {
            console.log('Dispatching saved components to Redux:', savedComponents);
            dispatch(loadComponents(savedComponents));
        }

        // Load saved connections
        const savedConnections = getConnections();
        if (savedConnections.length > 0) {
            console.log('Dispatching saved connections to Redux:', savedConnections);
            dispatch(loadConnections(savedConnections));
        }

        // Check backend connection
        const checkBackend = async () => {
            try {
                const response = await axios.get('http://localhost:8080/api/health');
                dispatch(setBackendStatus(response.data.status === 'OK' ? 'Backend connected' : 'Backend not connected'));
            } catch (error) {
                console.error('Error connecting to backend:', error);
                dispatch(setBackendStatus('Backend not connected'));
            }
        };

        checkBackend();

        // Initial cost calculation will happen in the components useEffect
    }, [dispatch]);

    // Save components whenever they change
    useEffect(() => {
        if (canvasComponents !== undefined) {
            console.log('Components changed - saving to localStorage:', canvasComponents);
            saveComponents(canvasComponents);

            // Update cost calculation
            updateBackendCost();
        }
    }, [canvasComponents]);

    // Save connections whenever they change
    useEffect(() => {
        if (connections !== undefined) {
            console.log('Connections changed - saving to localStorage:', connections);
            saveConnections(connections);
        }
    }, [connections]);

    const updateBackendCost = async () => {
        try {
            // If there are no components, set cost to 0
            if (!canvasComponents || canvasComponents.length === 0) {
                console.log('No components - setting cost to 0');
                dispatch(updateCost(0));
                return;
            }

            // Send components to backend
            await axios.post('http://localhost:8080/api/cost', { components: canvasComponents });

            // Get updated cost
            const response = await axios.get('http://localhost:8080/api/cost');
            dispatch(updateCost(response.data.total));
        } catch (error) {
            console.error('Error updating cost:', error);
            dispatch(updateCost('Error'));
        }
    };

    const handleSaveCustomName = (customName) => {
        if (customName.trim() && selectedComponent) {
            dispatch(updateComponentsFromStorage({
                id: selectedComponent.id,
                field: 'name',
                value: customName.trim()
            }));
        }
        dispatch(closeRenameModal());
    };

    return (
        <div className="App">
            <h1>Cloud Architecture Designer</h1>
            <p className={backendStatus === 'Backend connected' ? 'connected' : 'not-connected'}>
                {backendStatus}
            </p>
            <div className="main-container">
                <HierarchicalCanvasContainer />
                <CostSummary totalCost={totalCost} />
            </div>
            <GenerateTerraform />

            {/* Instructions for hierarchical model */}
            <div className="hierarchical-instructions">
                <h3>Using the Hierarchical Model:</h3>
                <ul>
                    <li>VPCs contain Subnets</li>
                    <li>Subnets contain resources (EC2, RDS, etc.)</li>
                    <li>Drag resources into their containers or use the connection tool</li>
                    <li>Container relationships appear as visual nesting rather than lines</li>
                </ul>
            </div>

            {/* Rename Modal */}
            {renameModalOpen && selectedComponent && (
                <RenameModal
                    component={selectedComponent}
                    onSave={handleSaveCustomName}
                    onCancel={() => dispatch(closeRenameModal())}
                />
            )}
        </div>
    );
}

export default App;