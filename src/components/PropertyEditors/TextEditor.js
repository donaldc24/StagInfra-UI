import React from 'react';
import '../styles/PropertyEditors.css';

const TextEditor = ({ definition, value, onChange }) => {
    const { key, label, placeholder } = definition;

    const handleChange = (e) => {
        onChange(key, e.target.value);
    };

    return (
        <div className="property-editor text-editor">
            <label htmlFor={`editor-${key}`}>{label}</label>
            <input
                id={`editor-${key}`}
                type="text"
                value={value || ''}
                onChange={handleChange}
                placeholder={placeholder || ''}
                className="property-input"
            />
        </div>
    );
};

export default TextEditor;