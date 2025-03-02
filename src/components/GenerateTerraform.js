import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { generateTerraform } from '../services/terraformGeneration';
import { selectComponents } from '../store/slices/componentsSlice';
import '../styles/GenerateTerraform.css';

const GenerateTerraform = () => {
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const canvasComponents = useSelector(selectComponents);
    const connections = useSelector(state => state.connections);

    const handleCopyToClipboard = async () => {
        const code = generateTerraform(canvasComponents, connections);
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <button
                className="terraform-button"
                onClick={() => setShowModal(true)}
                disabled={canvasComponents.length === 0}
            >
                Generate Terraform
            </button>

            {showModal && (
                <div className="modal-overlay terraform-modal">
                    <div className="modal-content">
                        <h3>Generated Terraform Code</h3>
                        <div className="code-content">
                            <pre>{generateTerraform(canvasComponents, connections)}</pre>
                        </div>
                        <div className="modal-buttons">
                            <button
                                onClick={handleCopyToClipboard}
                                className="modal-button save-button"
                            >
                                {copied ? 'Copied!' : 'Copy to Clipboard'}
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="modal-button cancel-button"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GenerateTerraform;