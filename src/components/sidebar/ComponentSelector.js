// src/components/ComponentSelector.js
import React from 'react';
import { getComponentCategories, awsComponentRegistry } from '../../services/hierarchicalAwsComponentRegistry';
import '../../styles/components.css';

const ComponentSelector = ({ onSelectComponent }) => {
    const categories = getComponentCategories();

    // Function to handle drag start of component
    const handleDragStart = (e, type) => {
        e.dataTransfer.setData('component-type', type);

        // Create a drag image
        const dragIcon = document.createElement('div');
        dragIcon.className = 'component-drag-preview';
        dragIcon.textContent = awsComponentRegistry[type].displayName;
        dragIcon.style.backgroundColor = awsComponentRegistry[type].color;
        document.body.appendChild(dragIcon);
        e.dataTransfer.setDragImage(dragIcon, 25, 25);

        // Clean up the drag image after dragend
        e.target.addEventListener('dragend', () => {
            document.body.removeChild(dragIcon);
        }, { once: true });
    };

    return (
        <div className="component-selector">
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
                                    onDragStart={(e) => handleDragStart(e, type)}
                                    onClick={() => onSelectComponent(type)}
                                >
                                    <div
                                        className="component-icon"
                                        style={{ backgroundColor: component.color }}
                                    >
                                        {/* If we had actual icons, we would use them here */}
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
};

export default ComponentSelector;