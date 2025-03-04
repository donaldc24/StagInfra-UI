import React from 'react';
import '../styles/components.css';

const SelectEditor = ({ definition, value, onChange }) => {
    const { key, label, options = [] } = definition;

    const handleChange = (e) => {
        onChange(key, e.target.value);
    };

    return (
        <div className="property-editor select-editor">
            <label htmlFor={`editor-${key}`}>{label}</label>
            <select
                id={`editor-${key}`}
                value={value || ''}
                onChange={handleChange}
                className="property-select"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default SelectEditor;