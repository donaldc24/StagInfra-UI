import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import OptimizedCanvasContainer from './canvas/OptimizedCanvasContainer';
import { FileCode } from 'lucide-react';

// Import actions
import { setLineMode } from '../store/slices/uiStateSlice';
import { updateComponent } from '../store/slices/componentsSlice';

// Import hooks
import useNotification from '../hooks/useNotification';

// Main application component
const CloudArchitectureDesigner = () => {
    const dispatch = useDispatch();

    // Redux state
    const backendStatus = useSelector(state => state.system?.backendStatus || 'disconnected');
    const components = useSelector(state => state.components?.list || []);
    const totalCost = useSelector(state => state.cost?.total || 0);
    const { isLineMode } = useSelector(state => state.uiState);

    // Local state
    const [activeTab, setActiveTab] = useState('add');
    const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(true);
    const [selectedComponent, setSelectedComponent] = useState(null);

    // Get notifications service
    const { notifications, showNotification } = useNotification();

    // AWS component categories
    const awsCategories = {
        compute: ['ec2', 'lambda'],
        storage: ['s3', 'ebs'],
        database: ['rds', 'dynamodb'],
        networking: ['vpc', 'subnet', 'securityGroup', 'loadBalancer']
    };

    // Effects
    useEffect(() => {
        // Listen for component selection events
        const handleComponentSelection = (event) => {
            if (event.detail && event.detail.component) {
                setSelectedComponent(event.detail.component);
                setIsPropertyPanelOpen(true);
            }
        };

        window.addEventListener('component-selected', handleComponentSelection);

        return () => {
            window.removeEventListener('component-selected', handleComponentSelection);
        };
    }, []);

    // Handlers
    const handleComponentSelect = (component) => {
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

    const generateTerraformCode = () => {
        // This would be implemented to call your terraform generation service
        // const code = generateTerraform(components, connections);
        showNotification("Terraform code generated successfully!", "success");
    };

    return (
        <div className="app-container">
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
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('component-type', item);
                                                        }}
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
                                                            <span className="property-value">{value}</span>
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
                                    onClick={() => {
                                        // Implement clear connections functionality
                                        showNotification('All connections cleared', 'success');
                                    }}
                                >
                                    Clear All Connections
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
                <div className="canvas-area">
                    {/* Render the optimized canvas container */}
                    <OptimizedCanvasContainer />

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

                                        {(selectedComponent.type === 'vpc' || selectedComponent.type === 'subnet') && (
                                            <div className="form-group">
                                                <label className="form-label">CIDR Block</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={selectedComponent.cidr_block || (selectedComponent.type === 'vpc' ? '10.0.0.0/16' : '10.0.1.0/24')}
                                                    onChange={(e) => updateComponentProperty(selectedComponent.id, 'cidr_block', e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="panel-footer">
                                    <button
                                        className="btn-danger"
                                        onClick={() => {
                                            // Implement delete component
                                            showNotification(`Deleted ${selectedComponent.type} component`, 'success');
                                            setSelectedComponent(null);
                                        }}
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

            {/* Notification container */}
            <div className="notification-container">
                {notifications && notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`notification notification-${notification.type || 'info'}`}
                    >
            <span className="notification-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </span>
                        <p className="notification-message">{notification.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CloudArchitectureDesigner;