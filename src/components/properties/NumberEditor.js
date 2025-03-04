import React from 'react';
import '../styles/components.css';

const NumberEditor = ({ definition, value, onChange }) => {
    const { key, label, min, max, step = 1 } = definition;

    const handleChange = (e) => {
        const newValue = e.target.value === '' ? '' : parseInt(e.target.value, 10);

        if (newValue === '' || isNaN(newValue)) {
            onChange(key, '');
            return;
        }

        // Apply min/max constraints
        const constrainedValue = Math.max(min || Number.MIN_SAFE_INTEGER,
            Math.min(max || Number.MAX_SAFE_INTEGER, newValue));

        onChange(key, constrainedValue);
    };

    return (
        <div className="property-editor number-editor">
            <label htmlFor={`editor-${key}`}>{label}</label>
            <input
                id={`editor-${key}`}
                type="number"
                value={value === undefined ? '' : value}
                onChange={handleChange}
                min={min}
                max={max}
                step={step}
                className="property-input"
            />
            {min !== undefined && max !== undefined && (
                <div className="range-hint">Range: {min} - {max}</div>
            )}
        </div>
    );
};

export default NumberEditor;