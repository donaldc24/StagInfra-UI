import React from 'react';
import '../styles/components.css';

const CheckboxEditor = ({ definition, value, onChange }) => {
    const { key, label } = definition;

    const handleChange = (e) => {
        onChange(key, e.target.checked);
    };

    return (
        <div className="property-editor checkbox-editor">
            <div className="checkbox-container">
                <input
                    id={`editor-${key}`}
                    type="checkbox"
                    checked={!!value}
                    onChange={handleChange}
                    className="property-checkbox"
                />
                <label htmlFor={`editor-${key}`}>{label}</label>
            </div>
        </div>
    );
};

export default CheckboxEditor;