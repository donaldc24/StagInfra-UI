// components/ReactSidebar.js
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTab, setLineMode } from '../store/slices/uiStateSlice';
import { openRenameModal } from '../store/slices/uiStateSlice';
import { updateComponent, selectComponents } from '../store/slices/componentsSlice';
import { getComponentCategories, awsComponentRegistry } from '../services/awsComponentRegistry';
import '../styles/Sidebar.css';

// This is a React-based sidebar that can be used instead of the Konva-based one
// It's easier to implement scrolling and advanced UI features with React

const ReactSidebar = ({ onSelectComponent, onToggleLineMode, onClearConnections }) => {
    const dispatch = useDispatch();
    const { activeTab, isLineMode } = useSelector(state => state.uiState);
    const canvasComponents = useSelector(selectComponents);

    const handleSelectComponent = (type) => {
        if (onSelectComponent) {
            onSelectComponent(type);
        }
    };

    const handleTabChange = (tab) => {
        dispatch(setActiveTab(tab));
    };

    const handleToggleLineMode = () => {
        dispatch(setLineMode(!isLineMode));
        if (onToggleLineMode) {
            onToggleLineMode(!isLineMode);
        }
    };

    const incrementValue = (id, field, delta) => {
        const comp = canvasComponents.find((c) => c?.id === id);
        if (!comp) return;

        const current = comp[field] !== undefined ? comp[field] : 0;

        // Get min/max values from component metadata if available
        const metadata = awsComponentRegistry[comp.type];
        const propertyDef = metadata?.propertyEditors?.find(p => p.key === field);

        const min = propertyDef?.min || 0;
        const max = propertyDef?.max || 9999;

        const newValue = Math.max(min, Math.min(max, current + delta));

        dispatch(updateComponent({
            id,
            changes: { [field]: newValue }
        }));
    };

    // Get categories and component types for the Add tab
    const categories = getComponentCategories();

    // Determine which tab content to show
    const renderTabContent = () => {
        switch (activeTab) {
            case 'add':
                return (
                    <div className="tab-content add-tab">
                        {Object.entries(categories).map(([category, componentTypes]) => (
                            <div key={category} className="component-category">
                                <h3 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                                <div className="component-grid">
                                    {componentTypes.map(type => {
                                        const component = awsComponentRegistry[type];
                                        return (
                                            <div
                                                key={type}
                                                className="component-item"
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('component-type', type);
                                                }}
                                                onClick={() => handleSelectComponent(type)}
                                            >
                                                <div
                                                    className="component-icon"
                                                    style={{ backgroundColor: component.color }}
                                                >
                                                    {type.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="component-name">{component.displayName}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'components':
                return (
                    <div className="tab-content components-tab">
                        {canvasComponents.length === 0 ? (
                            <div className="no-components">
                                No components added
                            </div>
                        ) : (
                            <div className="component-list">
                                {canvasComponents.map(comp => {
                                    if (!comp || !comp.type || !comp.id) {
                                        return null;
                                    }

                                    const metadata = awsComponentRegistry[comp.type] || {};
                                    const displayName = comp.name || metadata.displayName || `${(comp.type || '').toUpperCase()}-${(comp.id || '').slice(-4) || ''}`;

                                    // Get properties to display (limit to first 3)
                                    const propertiesToShow = metadata.propertyEditors
                                        ? metadata.propertyEditors.slice(0, 3)
                                        : [];

                                    return (
                                        <div key={comp.id} className="component-list-item">
                                            <div className="component-header">
                                                <div className="component-color" style={{ backgroundColor: metadata.color }}></div>
                                                <div className="component-title">{displayName}</div>
                                                <button
                                                    className="component-action-button"
                                                    onClick={() => dispatch(openRenameModal(comp))}
                                                >
                                                    Rename
                                                </button>
                                            </div>

                                            <div className="component-properties">
                                                {propertiesToShow.map(prop => {
                                                    const value = comp[prop.key] !== undefined
                                                        ? comp[prop.key]
                                                        : (metadata.defaultProperties?.[prop.key] || '');

                                                    return (
                                                        <React.Fragment key={prop.key}>
                                                            <div className="property-label">{prop.label}:</div>
                                                            <div className="property-value">
                                                                <input
                                                                    type={prop.type === 'number' ? 'number' : 'text'}
                                                                    className="property-input"
                                                                    value={value}
                                                                    onChange={(e) => {
                                                                        const newValue = prop.type === 'number'
                                                                            ? parseInt(e.target.value) || 0
                                                                            : e.target.value;

                                                                        dispatch(updateComponent({
                                                                            id: comp.id,
                                                                            changes: { [prop.key]: newValue }
                                                                        }));
                                                                    }}
                                                                    min={prop.min}
                                                                    max={prop.max}
                                                                />

                                                                {prop.type === 'number' && (
                                                                    <div className="property-buttons">
                                                                        <div
                                                                            className="property-button"
                                                                            onClick={() => incrementValue(comp.id, prop.key, 1)}
                                                                        >
                                                                            ▲
                                                                        </div>
                                                                        <div
                                                                            className="property-button"
                                                                            onClick={() => incrementValue(comp.id, prop.key, -1)}
                                                                        >
                                                                            ▼
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            case 'tools':
                return (
                    <div className="tab-content tools-tab">
                        <div className="tools-container">
                            <div
                                className={`tool-button ${isLineMode ? 'active' : ''}`}
                                onClick={handleToggleLineMode}
                            >
                                {isLineMode ? 'Exit Line Mode' : 'Connection Tool'}
                            </div>

                            <div
                                className="tool-button danger"
                                onClick={onClearConnections}
                            >
                                Clear All Connections
                            </div>

                            <div className="tool-info">
                                <div className="tool-info-title">Connection Instructions:</div>
                                <div className="tool-info-text">
                                    1. Click 'Connection Tool' to activate<br />
                                    2. Click source component<br />
                                    3. Click target component<br /><br />
                                    <strong>Creating a VPC Architecture:</strong><br />
                                    • Connect Subnets to VPC<br />
                                    • Connect EC2/RDS to Subnets<br />
                                    • Connect Security Groups to resources
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="sidebar-container">
            <div className="sidebar-tabs">
                {['add', 'components', 'tools'].map(tab => (
                    <div
                        key={tab}
                        className={`sidebar-tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </div>
                ))}
            </div>
            <div className="sidebar-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default ReactSidebar;