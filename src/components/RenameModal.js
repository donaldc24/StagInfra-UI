import React, { useState, useEffect } from 'react';
import '../styles/Modal.css';

const RenameModal = ({ component, onSave, onCancel }) => {
    const [customName, setCustomName] = useState('');

    useEffect(() => {
        if (component) {
            setCustomName(component.name || `${component.type.toUpperCase()}-${component.id.slice(-4)}`);
        }
    }, [component]);

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Rename {component.type.toUpperCase()}</h3>
                <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="modal-input"
                    placeholder="Enter custom name"
                    autoFocus
                />
                <div className="modal-buttons">
                    <button
                        onClick={() => onSave(customName)}
                        className="modal-button save-button"
                    >
                        Save
                    </button>
                    <button
                        onClick={onCancel}
                        className="modal-button cancel-button"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameModal;