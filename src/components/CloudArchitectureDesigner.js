// src/components/CloudArchitectureDesigner.js
import React, {useState, useEffect, useRef, useCallback} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import OptimizedCanvasContainer from './canvas/OptimizedCanvasContainer';
import { FileCode } from 'lucide-react';

// Import actions
import { setLineMode } from '../store/slices/uiStateSlice';
import { addComponent, updateComponent, removeComponent } from '../store/slices/componentsSlice';
import { removeComponentConnections, clearConnections } from '../store/slices/connectionsSlice';


// Import hooks
import useNotification from '../hooks/useNotification';

// Import utilities
import { getComponentMetadata, getDefaultProperties } from '../services/hierarchicalAwsComponentRegistry';
import { generateTerraform } from '../services/hierarchicalTerraformGenerator';

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
    const [selectedConnectionId, setSelectedConnectionId] = useState(null);

    // Redux state
    const backendStatus = useSelector(state => state.system?.backendStatus || 'disconnected');
    const components = useSelector(state => state.components?.list || []);
    const connections = useSelector(state => state.connections || []);
    const totalCost = useSelector(state => state.cost?.total || 0);
    const { isLineMode } = useSelector(state => state.uiState);
    const scale = useSelector(state => state.uiState?.scale || 1);
    const position = useSelector(state => state.uiState?.position || { x: 0, y: 0 });

    // Local state
    const [activeTab, setActiveTab] = useState('add');
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

    // AWS component categories
    const awsCategories = {
        compute: ['ec2', 'lambda'],
        storage: ['s3', 'ebs'],
        database: ['rds', 'dynamodb'],
        networking: ['vpc', 'subnet', 'securityGroup', 'loadBalancer']
    };

    const handleClearAllConnections = useCallback(() => {
        // Dispatch an action to clear all connections
        dispatch(clearConnections());

        // Optional: Reset any connection-related UI state
        setSelectedConnectionId(null);

        // Show a notification
        showNotification('All connections cleared', 'success');
    }, [dispatch, showNotification]);

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
        console.log('Component selected:', component);
        setSelectedComponent(component);
        setIsPropertyPanelOpen(true);
    };

    const updateComponentProperty = (id, property, value) => {
        dispatch(updateComponent({
            id,
            changes: { [property]: value }
        }));
    };

    const toggleConnectionMode = () => {
        dispatch(setLineMode(!isLineMode));
        showNotification(
            !isLineMode
                ? "Connection mode activated. Click on a source component, then a target component."
                : "Connection mode deactivated",
            !isLineMode ? "info" : "success"
        );
    };

    const handleDeleteComponent = (componentId) => {
        if (!componentId) return;

        dispatch(removeComponent(componentId));
        dispatch(removeComponentConnections(componentId));
        setSelectedComponent(null);
        showNotification(`Component deleted`, 'success');
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

        if (isDebugEnabled) {
            document.getElementById('component-debug').innerText =
                `Added: ${componentType} at (${x}, ${y})`;
        }
    };


    // Render Terraform code modal
    const renderTerraformModal = () => {
        if (!terraformModalVisible) return null;

        return (
            <div className="modal-overlay terraform-modal">
                <div className="modal-content">
                    <h3>Generated Terraform Code</h3>
                    <div className="code-content">
                        <pre>{terraformCode}</pre>
                    </div>
                    <div className="modal-buttons">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(terraformCode);
                                showNotification("Terraform code copied to clipboard", "success");
                            }}
                            className="modal-button save-button"
                        >
                            Copy to Clipboard
                        </button>
                        <button
                            onClick={() => setTerraformModalVisible(false)}
                            className="modal-button cancel-button"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
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
                <div className="sidebar">
                    {/* Tab navigation */}
                    <div className="sidebar-tabs">
                        {['add', 'components', 'tools'].map(tab => (
                            <div
                                key={tab}
                                className={`sidebar-tab ${activeTab === tab ? 'sidebar-tab-active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </div>
                        ))}
                    </div>
                    {/* Tab content */}
                    <div className="sidebar-content">
                        {activeTab === 'add' && (
                            <div>
                                {Object.entries(awsCategories).map(([category, items]) => (
                                    <div key={category} className="component-category">
                                        <h3 className="category-title">
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </h3>
                                        <div className="component-grid">
                                            {items.map(item => {
                                                // Determine icon class based on service type
                                                let iconClass = 'icon-compute';
                                                if (item === 's3' || item === 'ebs') {
                                                    iconClass = 'icon-storage';
                                                } else if (item === 'rds' || item === 'dynamodb') {
                                                    iconClass = 'icon-database';
                                                } else if (item.includes('vpc') || item.includes('subnet') || item.includes('security')) {
                                                    iconClass = 'icon-networking';
                                                }

                                                return (
                                                    <div
                                                        key={item}
                                                        className="component-item"
                                                        draggable="true"
                                                        data-component-type={item}
                                                        onDragStart={(e) => {
                                                            console.log(`Started dragging component: ${item}`);

                                                            // Set both text/plain and application-specific data for compatibility
                                                            e.dataTransfer.setData('text/plain', item);
                                                            e.dataTransfer.setData('component-type', item);
                                                            e.dataTransfer.effectAllowed = 'copy';

                                                            // Create a custom drag image (optional)
                                                            const dragImage = document.createElement('div');
                                                            dragImage.textContent = item.toUpperCase();
                                                            dragImage.style.backgroundColor = iconClass === 'icon-compute' ? '#f97316' :
                                                                iconClass === 'icon-storage' ? '#16a34a' :
                                                                    iconClass === 'icon-database' ? '#2563eb' : '#7c3aed';
                                                            dragImage.style.color = 'white';
                                                            dragImage.style.padding = '5px 10px';
                                                            dragImage.style.borderRadius = '4px';
                                                            dragImage.style.position = 'absolute';
                                                            dragImage.style.top = '-1000px';
                                                            document.body.appendChild(dragImage);

                                                            // Set the drag image
                                                            e.dataTransfer.setDragImage(dragImage, 15, 15);

                                                            // Clean up
                                                            setTimeout(() => {
                                                                document.body.removeChild(dragImage);
                                                            }, 0);
                                                        }}
                                                        onClick={() => handleAddComponentClick(item)}
                                                    >
                                                        <div className={`component-icon-container ${iconClass}`}>
                                                            {item.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="component-name">
                                                            {item.toUpperCase()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'components' && (
                            <div>
                                {components.length > 0 ? (
                                    components.map(component => (
                                        <div
                                            key={component.id}
                                            className={`component-list-item ${selectedComponent?.id === component.id ? 'selected' : ''}`}
                                            onClick={() => handleComponentSelect(component)}
                                        >
                                            <div className="component-header">
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <div style={{
                                                        width: '0.75rem',
                                                        height: '0.75rem',
                                                        borderRadius: '9999px',
                                                        marginRight: '0.5rem',
                                                        backgroundColor: component.type === 'ec2' ? '#f97316' :
                                                            component.type === 's3' ? '#16a34a' :
                                                                component.type === 'vpc' ? '#7c3aed' :
                                                                    component.type === 'subnet' ? '#6366f1' :
                                                                        '#6b7280'
                                                    }}></div>
                                                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                                        {component.name || `${component.type.toUpperCase()}-${component.id.slice(-4)}`}
                                                    </span>
                                                </div>
                                                <span className="component-type-badge">
                                                    {component.type.toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="component-properties">
                                                {Object.entries(component)
                                                    .filter(([key]) => !['id', 'type', 'name', 'x', 'y', 'width', 'height'].includes(key))
                                                    .slice(0, 2)
                                                    .map(([key, value]) => (
                                                        <div key={key} className="property-row">
                                                            <span className="property-label">{key.replace('_', ' ')}:</span>
                                                            <span className="property-value">{value.toString()}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '2rem',
                                        color: '#9ca3af',
                                        backgroundColor: '#f9fafb',
                                        border: '1px dashed #d1d5db',
                                        borderRadius: '0.375rem'
                                    }}>
                                        <div style={{ marginBottom: '0.5rem', opacity: 0.5 }}>No components added yet</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'tools' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button
                                    style={{
                                        padding: '0.625rem 1rem',
                                        borderRadius: '0.375rem',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        backgroundColor: isLineMode ? '#dbeafe' : '#f3f4f6',
                                        color: isLineMode ? '#1e40af' : '#4b5563',
                                        border: isLineMode ? '1px solid #bfdbfe' : '1px solid #d1d5db',
                                    }}
                                    onClick={toggleConnectionMode}
                                >
                                    {isLineMode ? 'Exit Connection Mode' : 'Connection Tool'}
                                </button>

                                <button
                                    style={{
                                        padding: '0.625rem 1rem',
                                        borderRadius: '0.375rem',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        backgroundColor: '#fee2e2',
                                        color: '#b91c1c',
                                        border: '1px solid #fecaca',
                                    }}
                                    onClick={handleClearAllConnections}
                                >
                                    Clear All Connections
                                </button>

                                <button
                                    style={{
                                        padding: '0.625rem 1rem',
                                        borderRadius: '0.375rem',
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer',
                                        backgroundColor: isDebugEnabled ? '#fef3c7' : '#f3f4f6',
                                        color: isDebugEnabled ? '#92400e' : '#4b5563',
                                        border: isDebugEnabled ? '1px solid #fde68a' : '1px solid #d1d5db',
                                    }}
                                    onClick={() => setIsDebugEnabled(!isDebugEnabled)}
                                >
                                    {isDebugEnabled ? 'Disable Debug Mode' : 'Enable Debug Mode'}
                                </button>

                                <div style={{
                                    backgroundColor: '#dbeafe',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '0.375rem',
                                    padding: '0.75rem',
                                    marginTop: '1rem'
                                }}>
                                    <h4 style={{ fontWeight: 500, marginBottom: '0.5rem', color: '#1e40af', fontSize: '0.875rem' }}>
                                        Connection Instructions
                                    </h4>
                                    <ol style={{ paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#1e40af', lineHeight: 1.5 }}>
                                        <li>Click 'Connection Tool' to activate</li>
                                        <li>Click on a source component</li>
                                        <li>Click on a target component</li>
                                        <li>Only valid connections will be created</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

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

                {/* Right property panel - slides in/out */}
                {selectedComponent && (
                    <div className="properties-panel" style={{
                        width: isPropertyPanelOpen ? '256px' : '0',
                        overflow: isPropertyPanelOpen ? 'visible' : 'hidden'
                    }}>
                        {isPropertyPanelOpen && (
                            <>
                                <div className="panel-header">
                                    <h3 className="panel-title">Properties</h3>
                                    <button
                                        onClick={() => setIsPropertyPanelOpen(false)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#6b7280',
                                            display: 'flex'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </button>
                                </div>

                                <div className="panel-content">
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{
                                            width: '1rem',
                                            height: '1rem',
                                            borderRadius: '9999px',
                                            backgroundColor: selectedComponent.type === 'ec2' ? '#f97316' :
                                                selectedComponent.type === 's3' ? '#16a34a' :
                                                    selectedComponent.type === 'vpc' ? '#7c3aed' :
                                                        selectedComponent.type === 'subnet' ? '#6366f1' :
                                                            '#6b7280'
                                        }}></div>
                                        <h4 style={{ fontWeight: 600 }}>
                                            {selectedComponent.name || `${selectedComponent.type.toUpperCase()}-${selectedComponent.id.slice(-4)}`}
                                        </h4>
                                        <span className="component-type-badge">
                                            {selectedComponent.type.toUpperCase()}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={selectedComponent.name || ''}
                                                onChange={(e) => updateComponentProperty(selectedComponent.id, 'name', e.target.value)}
                                                placeholder={`${selectedComponent.type.toUpperCase()}-${selectedComponent.id.slice(-4)}`}
                                            />
                                        </div>

                                        {/* Display position information (for debugging) */}
                                        {isDebugEnabled && (
                                            <div className="form-group">
                                                <label className="form-label">Position</label>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    X: {selectedComponent.x.toFixed(0)}, Y: {selectedComponent.y.toFixed(0)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Render component-specific property editors */}
                                        {selectedComponent.type === 'ec2' && (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Instance Type</label>
                                                    <select
                                                        className="form-select"
                                                        value={selectedComponent.instance_type || 't2.micro'}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'instance_type', e.target.value)}
                                                    >
                                                        <option value="t2.nano">t2.nano (0.5 GiB)</option>
                                                        <option value="t2.micro">t2.micro (1 GiB)</option>
                                                        <option value="t2.small">t2.small (2 GiB)</option>
                                                        <option value="t2.medium">t2.medium (4 GiB)</option>
                                                        <option value="t2.large">t2.large (8 GiB)</option>
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Instance Count</label>
                                                    <div className="number-input-group">
                                                        <button
                                                            className="number-input-button number-input-button-left"
                                                            onClick={() => updateComponentProperty(
                                                                selectedComponent.id,
                                                                'instances',
                                                                Math.max(1, (selectedComponent.instances || 1) - 1)
                                                            )}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                            </svg>
                                                        </button>
                                                        <input
                                                            type="number"
                                                            className="form-input number-input"
                                                            value={selectedComponent.instances || 1}
                                                            onChange={(e) => updateComponentProperty(
                                                                selectedComponent.id,
                                                                'instances',
                                                                Math.max(1, parseInt(e.target.value) || 1)
                                                            )}
                                                            min="1"
                                                            max="20"
                                                        />
                                                        <button
                                                            className="number-input-button number-input-button-right"
                                                            onClick={() => updateComponentProperty(
                                                                selectedComponent.id,
                                                                'instances',
                                                                Math.min(20, (selectedComponent.instances || 1) + 1)
                                                            )}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {selectedComponent.type === 's3' && (
                                            <div className="form-group">
                                                <label className="form-label">Storage Estimate (GB)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={selectedComponent.storage || 10}
                                                    onChange={(e) => updateComponentProperty(selectedComponent.id, 'storage', parseInt(e.target.value) || 10)}
                                                    min="1"
                                                />
                                            </div>
                                        )}

                                        {selectedComponent.type === 'ebs' && (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Volume Size (GB)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={selectedComponent.size || 20}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'size', parseInt(e.target.value) || 20)}
                                                        min="1"
                                                        max="16384"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Volume Type</label>
                                                    <select
                                                        className="form-select"
                                                        value={selectedComponent.volume_type || 'gp2'}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'volume_type', e.target.value)}
                                                    >
                                                        <option value="gp2">General Purpose (gp2)</option>
                                                        <option value="gp3">General Purpose (gp3)</option>
                                                        <option value="io1">Provisioned IOPS (io1)</option>
                                                        <option value="st1">Throughput Optimized (st1)</option>
                                                        <option value="sc1">Cold Storage (sc1)</option>
                                                    </select>
                                                </div>

                                                {selectedComponent.volume_type === 'io1' && (
                                                    <div className="form-group">
                                                        <label className="form-label">IOPS</label>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={selectedComponent.iops || 100}
                                                            onChange={(e) => updateComponentProperty(selectedComponent.id, 'iops', parseInt(e.target.value) || 100)}
                                                            min="100"
                                                            max="64000"
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {(selectedComponent.type === 'vpc' || selectedComponent.type === 'subnet') && (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">CIDR Block</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={selectedComponent.cidr_block || (selectedComponent.type === 'vpc' ? '10.0.0.0/16' : '10.0.1.0/24')}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'cidr_block', e.target.value)}
                                                    />
                                                </div>

                                                {selectedComponent.type === 'subnet' && (
                                                    <div className="form-group">
                                                        <label className="form-label">Availability Zone</label>
                                                        <select
                                                            className="form-select"
                                                            value={selectedComponent.availability_zone || 'us-west-2a'}
                                                            onChange={(e) => updateComponentProperty(selectedComponent.id, 'availability_zone', e.target.value)}
                                                        >
                                                            <option value="us-west-2a">us-west-2a</option>
                                                            <option value="us-west-2b">us-west-2b</option>
                                                            <option value="us-west-2c">us-west-2c</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {selectedComponent.type === 'subnet' && (
                                                    <div className="form-group">
                                                        <label className="form-label">Public Subnet</label>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedComponent.public !== false}
                                                            onChange={(e) => updateComponentProperty(
                                                                selectedComponent.id,
                                                                'public',
                                                                e.target.checked
                                                            )}
                                                            style={{ marginLeft: '8px' }}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {selectedComponent.type === 'rds' && (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Database Engine</label>
                                                    <select
                                                        className="form-select"
                                                        value={selectedComponent.engine || 'mysql'}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'engine', e.target.value)}
                                                    >
                                                        <option value="mysql">MySQL</option>
                                                        <option value="postgres">PostgreSQL</option>
                                                        <option value="mariadb">MariaDB</option>
                                                        <option value="oracle-se2">Oracle SE2</option>
                                                        <option value="sqlserver-ex">SQL Server Express</option>
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Instance Class</label>
                                                    <select
                                                        className="form-select"
                                                        value={selectedComponent.instance_class || 'db.t2.micro'}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'instance_class', e.target.value)}
                                                    >
                                                        <option value="db.t2.micro">db.t2.micro</option>
                                                        <option value="db.t2.small">db.t2.small</option>
                                                        <option value="db.t2.medium">db.t2.medium</option>
                                                        <option value="db.m5.large">db.m5.large</option>
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Allocated Storage (GB)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={selectedComponent.allocated_storage || 20}
                                                        onChange={(e) => updateComponentProperty(
                                                            selectedComponent.id,
                                                            'allocated_storage',
                                                            parseInt(e.target.value) || 20
                                                        )}
                                                        min="20"
                                                        max="64000"
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Multi-AZ Deployment</label>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedComponent.multi_az === true}
                                                        onChange={(e) => updateComponentProperty(
                                                            selectedComponent.id,
                                                            'multi_az',
                                                            e.target.checked
                                                        )}
                                                        style={{ marginLeft: '8px' }}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {selectedComponent.type === 'dynamodb' && (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Billing Mode</label>
                                                    <select
                                                        className="form-select"
                                                        value={selectedComponent.billing_mode || 'PROVISIONED'}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'billing_mode', e.target.value)}
                                                    >
                                                        <option value="PROVISIONED">Provisioned Capacity</option>
                                                        <option value="PAY_PER_REQUEST">On-Demand (Pay per request)</option>
                                                    </select>
                                                </div>

                                                {selectedComponent.billing_mode !== 'PAY_PER_REQUEST' && (
                                                    <>
                                                        <div className="form-group">
                                                            <label className="form-label">Read Capacity Units</label>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                value={selectedComponent.read_capacity || 5}
                                                                onChange={(e) => updateComponentProperty(
                                                                    selectedComponent.id,
                                                                    'read_capacity',
                                                                    parseInt(e.target.value) || 5
                                                                )}
                                                                min="1"
                                                                max="40000"
                                                            />
                                                        </div>

                                                        <div className="form-group">
                                                            <label className="form-label">Write Capacity Units</label>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                value={selectedComponent.write_capacity || 5}
                                                                onChange={(e) => updateComponentProperty(
                                                                    selectedComponent.id,
                                                                    'write_capacity',
                                                                    parseInt(e.target.value) || 5
                                                                )}
                                                                min="1"
                                                                max="40000"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {selectedComponent.type === 'loadBalancer' && (
                                            <>
                                                <div className="form-group">
                                                    <label className="form-label">Load Balancer Type</label>
                                                    <select
                                                        className="form-select"
                                                        value={selectedComponent.lb_type || 'application'}
                                                        onChange={(e) => updateComponentProperty(selectedComponent.id, 'lb_type', e.target.value)}
                                                    >
                                                        <option value="application">Application Load Balancer</option>
                                                        <option value="network">Network Load Balancer</option>
                                                        <option value="classic">Classic Load Balancer</option>
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label">Internal</label>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedComponent.internal === true}
                                                        onChange={(e) => updateComponentProperty(
                                                            selectedComponent.id,
                                                            'internal',
                                                            e.target.checked
                                                        )}
                                                        style={{ marginLeft: '8px' }}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="panel-footer">
                                    <button
                                        className="btn-danger"
                                        onClick={() => handleDeleteComponent(selectedComponent.id)}
                                    >
                                        Delete Component
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

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
            {renderTerraformModal()}

            {/* Notification container */}
            <div className="notification-container">
                {notifications && notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`notification notification-${notification.type || 'info'}`}
                    >
                        <div className="notification-content">
                <span className="notification-icon">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </span>
                            <p className="notification-message">{notification.message}</p>
                            <button
                                className="notification-close"
                                onClick={() => dismissNotification(notification.id)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

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