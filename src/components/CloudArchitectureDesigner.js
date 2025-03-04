// src/components/CloudArchitectureDesigner.js - Updated imports
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileCode } from 'lucide-react';

// Import components
import OptimizedCanvasContainer from './canvas/OptimizedCanvasContainer';
import PropertyPanel from './sidebar/PropertyPanel';
import Sidebar from './sidebar/Sidebar';
import Modal from './shared/Modal';
import Notification from './shared/Notification';

// Import actions
import { setLineMode } from '../store/slices/uiStateSlice';
import { addComponent, updateComponent, removeComponent } from '../store/slices/componentsSlice';
import { removeComponentConnections, clearConnections } from '../store/slices/connectionsSlice';

// Import hooks
import useNotification from '../hooks/useNotification';
import useCostCalculation from '../hooks/useCostCalculation';

// Import utilities - Updated imports to use new structure
import {
    getComponentMetadata,
    getDefaultProperties
} from '../services/aws';
import { generateTerraform } from '../services/terraform';

// Debug overlay component
const DebugOverlay = ({ enabled }) => {
    if (!enabled) return null;

    return (
        <div
            style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: 10,
                zIndex: 9999,
                maxWidth: 300,
                fontSize: 12
            }}
        >
            <h4 style={{ margin: '0 0 5px 0' }}>Component Debug</h4>
            <div id="component-debug"></div>
            <div id="drag-events"></div>
        </div>
    );
};

// Main application component
const CloudArchitectureDesigner = () => {
    const dispatch = useDispatch();
    const canvasRef = useRef(null);

    // Redux state
    const backendStatus = useSelector(state => state.system?.backendStatus || 'disconnected');
    const components = useSelector(state => state.components?.list || []);
    const connections = useSelector(state => state.connections || []);
    const { isLineMode } = useSelector(state => state.uiState);
    const scale = useSelector(state => state.uiState?.scale || 1);
    const position = useSelector(state => state.uiState?.position || { x: 0, y: 0 });

    // Cost calculation hook
    const { totalCost, refreshCost } = useCostCalculation();

    // Local state
    const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(true);
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [isDebugEnabled, setIsDebugEnabled] = useState(false);
    const [canvasSize, setCanvasSize] = useState({
        width: window.innerWidth - 300, // Adjust based on sidebar width
        height: window.innerHeight - 60 // Adjust based on header height
    });

    // Terraform modal state
    const [terraformModalVisible, setTerraformModalVisible] = useState(false);
    const [terraformCode, setTerraformCode] = useState('');

    // Get notifications service
    const {
        notifications,
        showNotification,
        dismissNotification
    } = useNotification();

    // Effects
    useEffect(() => {
        // Listen for component selection events
        const handleComponentSelectionEvent = (event) => {
            if (event.detail && event.detail.component) {
                setSelectedComponent(event.detail.component);
                setIsPropertyPanelOpen(true);
            }
        };

        // Listen for resize events to update canvas size
        const handleResize = () => {
            setCanvasSize({
                width: window.innerWidth - 300,
                height: window.innerHeight - 60
            });
        };

        // Listen for keyboard events for debugging
        const handleKeyDown = (e) => {
            if (e.key === 'd' && e.ctrlKey) {
                setIsDebugEnabled(prev => !prev);
                console.log('Debug mode toggled');
            }
        };

        window.addEventListener('component-selected', handleComponentSelectionEvent);
        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('component-selected', handleComponentSelectionEvent);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Handlers
    const handleComponentSelect = (component) => {
        setSelectedComponent(component);
        setIsPropertyPanelOpen(true);

        // Refresh cost when a component is selected
        refreshCost();
    };

    const updateComponentProperty = (id, property, value) => {
        if (!id) return;

        // Update the component in Redux store
        dispatch(updateComponent({
            id,
            changes: { [property]: value }
        }));

        // If the property affects cost, trigger a cost refresh
        const costAffectingProperties = [
            'instance_type', 'instances', 'storage', 'size',
            'volume_type', 'iops', 'instance_class', 'allocated_storage',
            'multi_az', 'billing_mode', 'read_capacity', 'write_capacity',
            'memory', 'lb_type'
        ];

        if (costAffectingProperties.includes(property)) {
            refreshCost();
        }

        // Make sure our selected component state is also updated if it's the one being modified
        if (selectedComponent && selectedComponent.id === id) {
            setSelectedComponent(prev => ({
                ...prev,
                [property]: value
            }));
        }
    };

    const handleDeleteComponent = (componentId) => {
        if (!componentId) return;

        dispatch(removeComponent(componentId));
        dispatch(removeComponentConnections(componentId));
        setSelectedComponent(null);
        showNotification(`Component deleted`, 'success');

        // Refresh cost calculation after component deletion
        setTimeout(() => refreshCost(), 10);
    };

    const handleClearAllConnections = useCallback(() => {
        dispatch(clearConnections());
        showNotification('All connections cleared', 'success');
    }, [dispatch, showNotification]);

    const toggleDebugMode = () => {
        setIsDebugEnabled(!isDebugEnabled);
    };

    const generateTerraformCode = () => {
        try {
            // Generate the terraform code
            const code = generateTerraform(components, connections);

            // Set the code to state for the modal
            setTerraformCode(code);
            setTerraformModalVisible(true);

            showNotification("Terraform code generated successfully!", "success");
        } catch (error) {
            console.error("Error generating Terraform code:", error);
            showNotification("Error generating Terraform code", "error");
        }
    };

    const handleComponentDrop = (e) => {
        e.preventDefault();

        // Try both data formats for better browser compatibility
        let componentType = e.dataTransfer.getData('component-type') ||
            e.dataTransfer.getData('text/plain');

        if (!componentType) {
            console.error('No component type in drop data');
            return;
        }

        // Get drop position relative to canvas
        const canvasRect = e.currentTarget.getBoundingClientRect();

        // Adjust for current zoom level and pan position
        const x = ((e.clientX - canvasRect.left) / scale) - (position.x / scale);
        const y = ((e.clientY - canvasRect.top) / scale) - (position.y / scale);

        // Create and add the new component
        createNewComponent(componentType, x, y);
    };

    const handleAddComponentClick = (componentType) => {
        // Get currently visible canvas area
        const visibleWidth = canvasSize.width / scale;
        const visibleHeight = canvasSize.height / scale;

        // Calculate center of visible area
        const centerX = (position.x * -1 / scale) + (visibleWidth / 2);
        const centerY = (position.y * -1 / scale) + (visibleHeight / 2);

        // Add small random offset to prevent exact overlapping
        const offsetX = Math.random() * 30 - 15;
        const offsetY = Math.random() * 30 - 15;

        createNewComponent(componentType, centerX + offsetX, centerY + offsetY);
    };

    const createNewComponent = (componentType, x, y) => {
        // Validate component type
        if (!componentType || !getComponentMetadata(componentType)) {
            console.warn('Invalid component type:', componentType);
            return;
        }

        // Get component metadata
        const metadata = getComponentMetadata(componentType);
        const defaultProps = getDefaultProperties(componentType);

        // Set component size based on type and metadata
        let width, height;

        if (metadata.isContainer) {
            // Containers like VPC and subnet should be larger
            width = metadata.size?.width || 300;
            height = metadata.size?.height || 200;
        } else {
            // Regular components
            width = metadata.size?.width || 40;
            height = metadata.size?.height || 40;
        }

        // Create new component
        const newComponent = {
            id: `${componentType}-${Date.now()}`,
            type: componentType,
            x: x,
            y: y,
            width: width,
            height: height,
            isContainer: metadata.isContainer || false,
            ...defaultProps
        };

        // Add to Redux store
        dispatch(addComponent(newComponent));
        setSelectedComponent(newComponent);
        showNotification(`Added new ${metadata.displayName || componentType}`, 'success');

        // Refresh cost calculation
        setTimeout(() => refreshCost(), 10);

        if (isDebugEnabled) {
            document.getElementById('component-debug').innerText =
                `Added: ${componentType} at (${x}, ${y})`;
        }
    };

    // Modal actions for Terraform modal
    const terraformModalActions = {
        confirm: {
            label: 'Copy to Clipboard',
            onClick: () => {
                navigator.clipboard.writeText(terraformCode);
                showNotification("Terraform code copied to clipboard", "success");
            }
        },
        cancel: {
            label: 'Close',
            onClick: () => setTerraformModalVisible(false)
        }
    };

    return (
        <div className="app-container" ref={canvasRef}>
            {/* Debug Overlay */}
            <DebugOverlay enabled={isDebugEnabled} />

            {/* Header */}
            <header className="app-header">
                <h1 className="app-title">Cloud Architecture Designer</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className={`status-indicator ${backendStatus === 'connected' ? 'status-connected' : 'status-disconnected'}`}>
            <span className={`status-dot ${backendStatus === 'connected' ? 'status-dot-connected' : 'status-dot-disconnected'}`}></span>
              {backendStatus === 'connected' ? 'Backend Connected' : 'Backend Disconnected'}
          </span>

                    <button className="btn-primary" onClick={generateTerraformCode}>
                        <FileCode style={{ width: '1rem', height: '1rem' }} />
                        Generate Terraform
                    </button>
                </div>
            </header>

            {/* Main content */}
            <div className="main-content">
                {/* Left sidebar */}
                <Sidebar
                    components={components}
                    selectedComponentId={selectedComponent?.id}
                    onComponentSelect={handleComponentSelect}
                    onAddComponent={handleAddComponentClick}
                    onClearConnections={handleClearAllConnections}
                    isDebugEnabled={isDebugEnabled}
                    toggleDebugMode={toggleDebugMode}
                />

                {/* Center canvas area */}
                <div
                    className="canvas-area"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleComponentDrop}
                >
                    {/* Render the optimized canvas container */}
                    <OptimizedCanvasContainer
                        onComponentSelect={handleComponentSelect}
                        showNotification={showNotification}
                    />

                    {/* Cost indicator */}
                    <div className="cost-widget">
                        <h3 className="cost-title">Cost Estimate</h3>
                        <p className="cost-amount">
                            ${typeof totalCost === 'number' ? totalCost.toFixed(2) : totalCost}
                            <span className="cost-period">/month</span>
                        </p>
                        <p className="cost-note">Based on on-demand pricing</p>
                    </div>
                </div>

                {/* Right property panel */}
                <PropertyPanel
                    isOpen={isPropertyPanelOpen}
                    onClose={() => setIsPropertyPanelOpen(false)}
                    component={selectedComponent}
                    onPropertyChange={updateComponentProperty}
                    onDelete={handleDeleteComponent}
                    isDebugEnabled={isDebugEnabled}
                />

                {/* Collapsed property panel toggle */}
                {!isPropertyPanelOpen && selectedComponent && (
                    <button
                        className="panel-toggle"
                        onClick={() => setIsPropertyPanelOpen(true)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                )}
            </div>

            {/* Terraform Code Modal */}
            <Modal
                isOpen={terraformModalVisible}
                onClose={() => setTerraformModalVisible(false)}
                title="Generated Terraform Code"
                className="terraform-modal"
                actions={terraformModalActions}
                size="lg"
            >
                <div className="code-content">
                    <pre>{terraformCode}</pre>
                </div>
            </Modal>

            {/* Notification component */}
            <Notification
                notifications={notifications}
                onDismiss={dismissNotification}
            />

            {/* Invisible drop area for component dragging */}
            <div
                id="drop-overlay"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: -1
                }}
            />
        </div>
    );
};

export default CloudArchitectureDesigner;