// src/components/shared/Modal.js
import React, { useEffect, useRef } from 'react';

/**
 * Reusable Modal component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Function to call when the modal should close
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.className - Additional CSS class names for the modal
 * @param {Object} props.actions - Actions/buttons for the modal footer
 * @param {string} props.size - Modal size ('sm', 'md', 'lg', or 'xl')
 */
const Modal = ({
                   isOpen,
                   onClose,
                   title,
                   children,
                   className = '',
                   actions,
                   size = 'md'
               }) => {
    const modalRef = useRef(null);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Close modal on ESC key
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen, onClose]);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    // Calculate modal width based on size prop
    const getModalWidth = () => {
        switch(size) {
            case 'sm': return '300px';
            case 'lg': return '600px';
            case 'xl': return '800px';
            case 'md':
            default: return '450px';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div
                ref={modalRef}
                className={`modal-content ${className}`}
                style={{ width: getModalWidth() }}
            >
                {title && <h3>{title}</h3>}

                <div className="modal-body">
                    {children}
                </div>

                {actions && (
                    <div className="modal-buttons">
                        {actions.cancel && (
                            <button
                                onClick={actions.cancel.onClick}
                                className="modal-button cancel-button"
                            >
                                {actions.cancel.label || 'Cancel'}
                            </button>
                        )}

                        {actions.confirm && (
                            <button
                                onClick={actions.confirm.onClick}
                                className={`modal-button ${actions.confirm.className || 'save-button'}`}
                            >
                                {actions.confirm.label || 'Confirm'}
                            </button>
                        )}

                        {/* Additional action buttons */}
                        {actions.extra?.map((action, index) => (
                            <button
                                key={index}
                                onClick={action.onClick}
                                className={`modal-button ${action.className || ''}`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;