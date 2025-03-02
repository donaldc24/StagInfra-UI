import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import CanvasContainer from './components/CanvasContainer';
import CostSummary from './components/CostSummary';
import GenerateTerraform from './components/GenerateTerraform';
import RenameModal from './components/RenameModal';
import { setBackendStatus } from './store/slices/systemSlice';
import { loadComponents, updateComponentsFromStorage, selectComponents } from './store/slices/componentsSlice';
import { loadConnections } from './store/slices/connectionsSlice';
import { updateCost } from './store/slices/costSlice';
import { closeRenameModal } from './store/slices/uiStateSlice';
import './styles/App.css';

function App() {
    const dispatch = useDispatch();
    const backendStatus = useSelector(state => state.system.backendStatus);
    const canvasComponents = useSelector(selectComponents);
    const { renameModalOpen, selectedComponent } = useSelector(state => state.uiState);
    const totalCost = useSelector(state => state.cost.total);

    useEffect(() => {
        const initializeState = async () => {
            try {
                // Check backend health
                const healthResponse = await axios.get('http://localhost:8080/api/health');
                dispatch(setBackendStatus(healthResponse.data.status === 'OK' ? 'Backend connected' : 'Backend not connected'));

                // Load components and connections from localStorage
                const savedComponents = localStorage.getItem('canvasComponents');
                const savedConnections = localStorage.getItem('connections');

                if (savedComponents) {
                    let components = JSON.parse(savedComponents);
                    // Filter out invalid components
                    components = components.filter(comp => comp && comp.type && comp.id);
                    dispatch(loadComponents(components));
                    localStorage.setItem('canvasComponents', JSON.stringify(components));
                }

                if (savedConnections) {
                    dispatch(loadConnections(JSON.parse(savedConnections)));
                }

                // Update cost from backend
                await updateBackendCost();
            } catch (error) {
                console.error('Error initializing state:', error);
                dispatch(setBackendStatus('Backend not connected'));
            }
        };

        initializeState();
    }, [dispatch]);

    const updateBackendCost = async () => {
        try {
            const components = canvasComponents;

            // If there are no components, explicitly set cost to 0
            if (components.length === 0) {
                dispatch(updateCost(0));
                return;
            }

            await axios.post('http://localhost:8080/api/cost', { components });
            const response = await axios.get('http://localhost:8080/api/cost');
            dispatch(updateCost(response.data.total));
        } catch (error) {
            console.error('Error updating cost:', error);
            dispatch(updateCost('Error'));
        }
    };

    // Handle component update in localStorage and backend
    useEffect(() => {
        localStorage.setItem('canvasComponents', JSON.stringify(canvasComponents));
        updateBackendCost();
    }, [canvasComponents]);

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
            <h1>Cloud Design Tool</h1>
            <p className={backendStatus === 'Backend connected' ? 'connected' : 'not-connected'}>
                {backendStatus}
            </p>
            <div className="main-container">
                <CanvasContainer />
                <CostSummary totalCost={totalCost} />
            </div>
            <GenerateTerraform />

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