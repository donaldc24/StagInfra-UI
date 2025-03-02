import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CanvasContainer from './components/CanvasContainer';
import CostSummary from './components/CostSummary';
import GenerateTerraform from './components/GenerateTerraform';
import './styles/App.css';

function App() {
    const [backendStatus, setBackendStatus] = useState('Checking...');
    const [canvasComponents, setCanvasComponents] = useState([]);
    const [draggingComponent, setDraggingComponent] = useState(null);
    const [connections, setConnections] = useState([]);
    const [isLineMode, setIsLineMode] = useState(false);
    const [lineStart, setLineStart] = useState(null);
    const [ghostLine, setGhostLine] = useState(null);
    const [activeTab, setActiveTab] = useState('add');
    const [totalCost, setTotalCost] = useState(0);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [customName, setCustomName] = useState('');

    useEffect(() => {
        const initializeState = async () => {
            try {
                const healthResponse = await axios.get('http://localhost:8080/api/health');
                setBackendStatus(healthResponse.data.status === 'OK' ? 'Backend connected' : 'Backend not connected');

                const savedComponents = localStorage.getItem('canvasComponents');
                const savedConnections = localStorage.getItem('connections');
                let components = savedComponents ? JSON.parse(savedComponents) : [];
                // Filter out invalid components (type: null or missing required fields)
                components = components.filter(comp => comp && comp.type && (comp.type === 'ec2' || comp.type === 's3') && comp.id);
                console.log('Loaded and Filtered Components:', components);
                setCanvasComponents(components);
                localStorage.setItem('canvasComponents', JSON.stringify(components)); // Update localStorage with cleaned data
                if (savedConnections) setConnections(JSON.parse(savedConnections));

                await updateBackendCost(components);
            } catch (error) {
                console.error('Error initializing state:', error);
                setBackendStatus('Backend not connected');
            }
        };

        initializeState();
    }, []);

    const updateBackendCost = async (components = canvasComponents) => {
        try {
            await axios.post('http://localhost:8080/api/cost', { components });
            const response = await axios.get('http://localhost:8080/api/cost');
            setTotalCost(response.data.total);
        } catch (error) {
            console.error('Error updating cost:', error);
            setTotalCost('Error');
        }
    };

    const handleMouseDown = (type, e) => {
        if (!isLineMode && (type === 'ec2' || type === 's3')) {
            const stage = e.target.getStage();
            const pointerPosition = stage.getPointerPosition();
            setDraggingComponent({
                type,
                x: pointerPosition.x,
                y: pointerPosition.y,
                width: 40,
                height: 40,
                fill: type === 'ec2' ? 'orange' : 'green',
                opacity: 0.5,
                instances: type === 'ec2' ? 1 : undefined,
                storage: type === 's3' ? 10 : undefined,
            });
        }
    };

    const handleMouseMove = (e) => {
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();

        if (draggingComponent && !isLineMode) {
            setDraggingComponent({ ...draggingComponent, x: pointerPosition.x, y: pointerPosition.y });
        } else if (isLineMode && lineStart) {
            setGhostLine({
                points: [
                    lineStart.x + lineStart.width / 2,
                    lineStart.y + lineStart.height / 2,
                    pointerPosition.x,
                    pointerPosition.y,
                ],
            });
        }
    };

    const handleMouseUp = (e) => {
        if (!isLineMode && draggingComponent && (draggingComponent.type === 'ec2' || draggingComponent.type === 's3')) {
            const newComponent = {
                id: `${draggingComponent.type}-${Date.now()}`,
                x: draggingComponent.x + 10,
                y: draggingComponent.y + 10,
                width: 40,
                height: 40,
                fill: draggingComponent.fill,
                draggable: true,
                type: draggingComponent.type,
                instances: draggingComponent.instances,
                storage: draggingComponent.storage,
            };
            const updatedComponents = [...canvasComponents, newComponent];
            console.log('Adding Component:', newComponent);
            console.log('Updated Components:', updatedComponents);
            setCanvasComponents(updatedComponents);
            localStorage.setItem('canvasComponents', JSON.stringify(updatedComponents));
            updateBackendCost(updatedComponents);
            setDraggingComponent(null);
        }
    };

    const handleComponentClick = (comp, e) => {
        e.evt.preventDefault();
        if (isLineMode) {
            if (!lineStart) {
                setLineStart(comp);
            } else if (lineStart.id !== comp.id) {
                const newConnection = { from: lineStart.id, to: comp.id };
                const updatedConnections = [...connections, newConnection];
                setConnections(updatedConnections);
                localStorage.setItem('connections', JSON.stringify(updatedConnections));
                setLineStart(null);
                setGhostLine(null);
                setIsLineMode(false);
            }
        } else {
            setLineStart(comp);
        }
    };

    const handleDragMove = (e, compId) => {
        const updatedComponents = canvasComponents.map((comp) =>
            comp.id === compId ? { ...comp, x: e.target.x(), y: e.target.y() } : comp
        );
        setCanvasComponents(updatedComponents);
        localStorage.setItem('canvasComponents', JSON.stringify(updatedComponents));
    };

    const handleDragEnd = (e, compId) => {
        const stage = e.target.getStage();
        const pointerPosition = stage.getPointerPosition();
        console.log('Drag End:', { compId, x: pointerPosition.x, y: pointerPosition.y });
        if (
            pointerPosition &&
            pointerPosition.x >= 800 &&
            pointerPosition.x <= 1000 &&
            pointerPosition.y >= 0 &&
            pointerPosition.y <= 200
        ) {
            console.log('Deleting Component:', compId);
            const updatedComponents = canvasComponents.filter((comp) => comp && comp.id !== compId);
            const updatedConnections = connections.filter(
                (conn) => conn && conn.from !== compId && conn.to !== compId
            );
            setCanvasComponents(updatedComponents);
            setConnections(updatedConnections);
            localStorage.setItem('canvasComponents', JSON.stringify(updatedComponents));
            localStorage.setItem('connections', JSON.stringify(updatedConnections));
            updateBackendCost(updatedComponents);
            if (draggingComponent && draggingComponent.id === compId) {
                setDraggingComponent(null);
            }
        }
    };

    const handleClearConnections = () => {
        setConnections([]);
        localStorage.removeItem('connections');
    };

    const handleComponentUpdate = (id, field, value) => {
        const updatedComponents = canvasComponents.map((comp) => {
            if (comp.id === id) {
                const newValue =
                    field === 'instances'
                        ? Math.max(1, Math.min(10, parseInt(value) || 1))
                        : field === 'storage'
                            ? Math.max(10, Math.min(1000, parseInt(value) || 10))
                            : value;
                return { ...comp, [field]: newValue };
            }
            return comp;
        });
        setCanvasComponents(updatedComponents);
        localStorage.setItem('canvasComponents', JSON.stringify(updatedComponents));
        updateBackendCost(updatedComponents);
    };

    const openRenameModal = (comp) => {
        if (!comp || !comp.type || !comp.id) return;
        setSelectedComponent(comp);
        setCustomName(comp.name || `${comp.type.toUpperCase()}-${comp.id.slice(-4)}`);
        setRenameModalOpen(true);
    };

    const saveCustomName = () => {
        if (customName.trim() && selectedComponent) {
            handleComponentUpdate(selectedComponent.id, 'name', customName.trim());
        }
        closeRenameModal();
    };

    const closeRenameModal = () => {
        setRenameModalOpen(false);
        setSelectedComponent(null);
        setCustomName('');
    };

    return (
        <div className="App">
            <h1>Cloud Design Tool</h1>
            <p className={backendStatus === 'Backend connected' ? 'connected' : 'not-connected'}>
                {backendStatus}
            </p>
            <div className="main-container">
                <CanvasContainer
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isLineMode={isLineMode}
                    setIsLineMode={setIsLineMode}
                    canvasComponents={canvasComponents}
                    connections={connections}
                    lineStart={lineStart}
                    ghostLine={ghostLine}
                    draggingComponent={draggingComponent}
                    handleMouseDown={handleMouseDown}
                    handleMouseMove={handleMouseMove}
                    handleMouseUp={handleMouseUp}
                    handleComponentClick={handleComponentClick}
                    handleDragMove={handleDragMove}
                    handleDragEnd={handleDragEnd}
                    handleClearConnections={handleClearConnections}
                    handleComponentUpdate={handleComponentUpdate}
                    openRenameModal={openRenameModal}
                />
                <CostSummary totalCost={totalCost} />
            </div>
            <GenerateTerraform canvasComponents={canvasComponents} />

            {renameModalOpen && selectedComponent && (
                <div
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'white',
                        border: '1px solid gray',
                        width: '300px',
                        padding: '20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                    }}
                >
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                        Rename {selectedComponent.type.toUpperCase()}
                    </h3>
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
                        placeholder="Enter custom name"
                        autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                            onClick={saveCustomName}
                            style={{ padding: '5px 10px', cursor: 'pointer' }}
                        >
                            Save
                        </button>
                        <button
                            onClick={closeRenameModal}
                            style={{ padding: '5px 10px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;