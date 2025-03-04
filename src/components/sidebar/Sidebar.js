// src/components/sidebar/Sidebar.js
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Layers, X } from 'lucide-react';

// Import components
import ComponentSelector from './ComponentSelector';

// Import Redux actions
import { setLineMode } from '../../store/slices/uiStateSlice';

/**
 * Sidebar component containing tabs for adding components,
 * viewing existing components, and tools
 */
const Sidebar = ({
                     components,
                     selectedComponentId,
                     onComponentSelect,
                     onAddComponent,
                     onClearConnections,
                     isDebugEnabled,
                     toggleDebugMode
                 }) => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('add');

    // Redux state
    const isLineMode = useSelector(state => state.uiState.isLineMode);

    // AWS component categories
    const awsCategories = {
        compute: ['ec2', 'lambda'],
        storage: ['s3', 'ebs'],
        database: ['rds', 'dynamodb'],
        networking: ['vpc', 'subnet', 'securityGroup', 'loadBalancer']
    };

    // Toggle connection mode
    const toggleConnectionMode = () => {
        dispatch(setLineMode(!isLineMode));
    };

    // Handle component click
    const handleComponentClick = (component) => {
        if (onComponentSelect) {
            onComponentSelect(component);
        }
    };

    // Render component categories in Add tab
    const renderComponentCategories = () => {
        return Object.entries(awsCategories).map(([category, items]) => (
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
                                onClick={() => onAddComponent(item)}
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
        ));
    };

    // Render component list in Components tab
    const renderComponentList = () => {
        if (!components || components.length === 0) {
            return (
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
            );
        }

        return components.map(component => (
            <div
                key={component.id}
                className={`component-list-item ${selectedComponentId === component.id ? 'selected' : ''}`}
                onClick={() => handleComponentClick(component)}
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
        ));
    };

    // Render tools tab
    const renderToolsTab = () => {
        return (
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
                    <Layers size={16} />
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
                    onClick={onClearConnections}
                >
                    <X size={16} />
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
                    onClick={toggleDebugMode}
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
        );
    };

    return (
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
                {activeTab === 'add' && renderComponentCategories()}
                {activeTab === 'components' && renderComponentList()}
                {activeTab === 'tools' && renderToolsTab()}
            </div>
        </div>
    );
};

export default Sidebar;