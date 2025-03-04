// src/components/PropertyEditor.js
import React, { useState, useEffect } from 'react';
import useDebouncedUpdate from '../hooks/useDebouncedUpdate';

const PropertyEditor = ({ component, onPropertyChange }) => {
    // Local state to track property values during editing
    const [localValues, setLocalValues] = useState({});

    // Use our debounced update hook for Redux updates
    const debouncedUpdate = useDebouncedUpdate(onPropertyChange, 300);

    // Initialize local values when component changes
    useEffect(() => {
        if (component) {
            setLocalValues({ ...component });
        }
    }, [component]);

    // Update local state immediately, then queue debounced Redux update
    const handlePropertyChange = (property, value) => {
        // Update local state immediately for responsive UI
        setLocalValues(prev => ({
            ...prev,
            [property]: value
        }));

        // Queue update to Redux store (debounced)
        debouncedUpdate(component.id, property, value);
    };

    // Return null if no component is selected
    if (!component) return null;

    // Render the appropriate editor based on component type
    return (
        <div className="property-editor">
            {/* Common properties for all components */}
            <div className="form-group">
                <label className="form-label">Name</label>
                <input
                    type="text"
                    className="form-input"
                    value={localValues.name || ''}
                    onChange={(e) => handlePropertyChange('name', e.target.value)}
                    placeholder={`${component.type.toUpperCase()}-${component.id.slice(-4)}`}
                />
            </div>

            {/* Component-specific properties */}
            {renderComponentProperties(component.type, localValues, handlePropertyChange)}
        </div>
    );
};

// Render component-specific properties
const renderComponentProperties = (type, values, onChange) => {
    switch (type) {
        case 'ec2':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Instance Type</label>
                        <select
                            className="form-select"
                            value={values.instance_type || 't2.micro'}
                            onChange={(e) => onChange('instance_type', e.target.value)}
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
                                onClick={() => onChange(
                                    'instances',
                                    Math.max(1, (values.instances || 1) - 1)
                                )}
                                type="button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                            <input
                                type="number"
                                className="form-input number-input"
                                value={values.instances || 1}
                                onChange={(e) => onChange(
                                    'instances',
                                    Math.max(1, parseInt(e.target.value) || 1)
                                )}
                                min="1"
                                max="20"
                            />
                            <button
                                className="number-input-button number-input-button-right"
                                onClick={() => onChange(
                                    'instances',
                                    Math.min(20, (values.instances || 1) + 1)
                                )}
                                type="button"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </>
            );

        case 's3':
            return (
                <div className="form-group">
                    <label className="form-label">Storage Estimate (GB)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={values.storage || 10}
                        onChange={(e) => onChange(
                            'storage',
                            parseInt(e.target.value) || 10
                        )}
                        min="1"
                    />
                </div>
            );

        case 'ebs':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Volume Size (GB)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={values.size || 20}
                            onChange={(e) => onChange(
                                'size',
                                parseInt(e.target.value) || 20
                            )}
                            min="1"
                            max="16384"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Volume Type</label>
                        <select
                            className="form-select"
                            value={values.volume_type || 'gp2'}
                            onChange={(e) => onChange(
                                'volume_type',
                                e.target.value
                            )}
                        >
                            <option value="gp2">General Purpose (gp2)</option>
                            <option value="gp3">General Purpose (gp3)</option>
                            <option value="io1">Provisioned IOPS (io1)</option>
                            <option value="st1">Throughput Optimized (st1)</option>
                            <option value="sc1">Cold Storage (sc1)</option>
                        </select>
                    </div>

                    {values.volume_type === 'io1' && (
                        <div className="form-group">
                            <label className="form-label">IOPS</label>
                            <input
                                type="number"
                                className="form-input"
                                value={values.iops || 100}
                                onChange={(e) => onChange(
                                    'iops',
                                    parseInt(e.target.value) || 100
                                )}
                                min="100"
                                max="64000"
                            />
                        </div>
                    )}
                </>
            );

        case 'vpc':
        case 'subnet':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">CIDR Block</label>
                        <input
                            type="text"
                            className="form-input"
                            value={values.cidr_block || (type === 'vpc' ? '10.0.0.0/16' : '10.0.1.0/24')}
                            onChange={(e) => onChange(
                                'cidr_block',
                                e.target.value
                            )}
                        />
                    </div>

                    {type === 'subnet' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Availability Zone</label>
                                <select
                                    className="form-select"
                                    value={values.availability_zone || 'us-west-2a'}
                                    onChange={(e) => onChange(
                                        'availability_zone',
                                        e.target.value
                                    )}
                                >
                                    <option value="us-west-2a">us-west-2a</option>
                                    <option value="us-west-2b">us-west-2b</option>
                                    <option value="us-west-2c">us-west-2c</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Public Subnet</label>
                                <input
                                    type="checkbox"
                                    checked={values.public !== false}
                                    onChange={(e) => onChange(
                                        'public',
                                        e.target.checked
                                    )}
                                    style={{ marginLeft: '8px' }}
                                />
                            </div>
                        </>
                    )}
                </>
            );

        case 'rds':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Database Engine</label>
                        <select
                            className="form-select"
                            value={values.engine || 'mysql'}
                            onChange={(e) => onChange('engine', e.target.value)}
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
                            value={values.instance_class || 'db.t2.micro'}
                            onChange={(e) => onChange('instance_class', e.target.value)}
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
                            value={values.allocated_storage || 20}
                            onChange={(e) => onChange(
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
                            checked={values.multi_az === true}
                            onChange={(e) => onChange(
                                'multi_az',
                                e.target.checked
                            )}
                            style={{ marginLeft: '8px' }}
                        />
                    </div>
                </>
            );

        case 'dynamodb':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Billing Mode</label>
                        <select
                            className="form-select"
                            value={values.billing_mode || 'PROVISIONED'}
                            onChange={(e) => onChange('billing_mode', e.target.value)}
                        >
                            <option value="PROVISIONED">Provisioned Capacity</option>
                            <option value="PAY_PER_REQUEST">On-Demand (Pay per request)</option>
                        </select>
                    </div>

                    {values.billing_mode !== 'PAY_PER_REQUEST' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Read Capacity Units</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={values.read_capacity || 5}
                                    onChange={(e) => onChange(
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
                                    value={values.write_capacity || 5}
                                    onChange={(e) => onChange(
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
            );

        case 'loadBalancer':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Load Balancer Type</label>
                        <select
                            className="form-select"
                            value={values.lb_type || 'application'}
                            onChange={(e) => onChange('lb_type', e.target.value)}
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
                            checked={values.internal === true}
                            onChange={(e) => onChange(
                                'internal',
                                e.target.checked
                            )}
                            style={{ marginLeft: '8px' }}
                        />
                    </div>
                </>
            );

        case 'lambda':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Runtime</label>
                        <select
                            className="form-select"
                            value={values.runtime || 'nodejs14.x'}
                            onChange={(e) => onChange('runtime', e.target.value)}
                        >
                            <option value="nodejs14.x">Node.js 14.x</option>
                            <option value="python3.9">Python 3.9</option>
                            <option value="java11">Java 11</option>
                            <option value="go1.x">Go 1.x</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Memory (MB)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={values.memory || 128}
                            onChange={(e) => onChange(
                                'memory',
                                parseInt(e.target.value) || 128
                            )}
                            min="128"
                            max="10240"
                            step="64"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Timeout (sec)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={values.timeout || 3}
                            onChange={(e) => onChange(
                                'timeout',
                                parseInt(e.target.value) || 3
                            )}
                            min="1"
                            max="900"
                        />
                    </div>
                </>
            );

        case 'securityGroup':
            return (
                <>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                            type="text"
                            className="form-input"
                            value={values.description || 'Security group created via Cloud Design Tool'}
                            onChange={(e) => onChange('description', e.target.value)}
                        />
                    </div>
                </>
            );

        default:
            return null;
    }
};

export default PropertyEditor;