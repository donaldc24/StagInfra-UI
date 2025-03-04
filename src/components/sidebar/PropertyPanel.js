// src/components/PropertyPanel.js
import React, { useState, useEffect, memo } from 'react';
import PropertyEditor from '../properties/PropertyEditor';

const PropertyPanel = memo(({
                                isOpen,
                                onClose,
                                component,
                                onPropertyChange,
                                onDelete,
                                isDebugEnabled
                            }) => {
    if (!component) return null;

    return (
        <div className="properties-panel" style={{
            width: isOpen ? '256px' : '0',
            overflow: isOpen ? 'visible' : 'hidden'
        }}>
            {isOpen && (
                <>
                    <div className="panel-header">
                        <h3 className="panel-title">Properties</h3>
                        <button
                            onClick={onClose}
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
                                backgroundColor: component.type === 'ec2' ? '#f97316' :
                                    component.type === 's3' ? '#16a34a' :
                                        component.type === 'vpc' ? '#7c3aed' :
                                            component.type === 'subnet' ? '#6366f1' :
                                                '#6b7280'
                            }}></div>
                            <h4 style={{ fontWeight: 600 }}>
                                {component.name || `${component.type.toUpperCase()}-${component.id.slice(-4)}`}
                            </h4>
                            <span className="component-type-badge">
                {component.type.toUpperCase()}
              </span>
                        </div>

                        {/* Use PropertyEditor component */}
                        <PropertyEditor
                            component={component}
                            onPropertyChange={onPropertyChange}
                        />

                        {/* Display position information (for debugging) */}
                        {isDebugEnabled && (
                            <div className="form-group">
                                <label className="form-label">Position</label>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    X: {component.x.toFixed(0)}, Y: {component.y.toFixed(0)}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="panel-footer">
                        <button
                            className="btn-danger"
                            onClick={() => onDelete(component.id)}
                        >
                            Delete Component
                        </button>
                    </div>
                </>
            )}
        </div>
    );
});

export default PropertyPanel;