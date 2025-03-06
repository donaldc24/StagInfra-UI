// src/components/shared/Tooltip.js
import React, { useState, useEffect, useRef } from 'react';
import '../../styles/awsComponents.css';

/**
 * Tooltip component that shows on hover
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Element that triggers the tooltip
 * @param {string} props.content - Tooltip content
 * @param {string} props.position - Tooltip position ('top', 'bottom', 'left', 'right')
 */
const Tooltip = ({ children, content, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const targetRef = useRef(null);
    const tooltipRef = useRef(null);

    // Calculate tooltip position
    const calculatePosition = () => {
        if (!targetRef.current || !tooltipRef.current) return;

        const targetRect = targetRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();

        let x = 0;
        let y = 0;

        switch (position) {
            case 'top':
                x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                y = targetRect.top - tooltipRect.height - 10;
                break;
            case 'bottom':
                x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                y = targetRect.bottom + 10;
                break;
            case 'left':
                x = targetRect.left - tooltipRect.width - 10;
                y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
            case 'right':
                x = targetRect.right + 10;
                y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
            default:
                x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                y = targetRect.top - tooltipRect.height - 10;
        }

        // Adjust for scroll
        x += window.scrollX;
        y += window.scrollY;

        setCoords({ x, y });
    };

    // Show tooltip
    const handleMouseEnter = () => {
        setIsVisible(true);
        // Use setTimeout to ensure the tooltip has rendered before calculating position
        setTimeout(() => calculatePosition(), 0);
    };

    // Hide tooltip
    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    // Update position if window is resized
    useEffect(() => {
        if (isVisible) {
            const handleResize = () => calculatePosition();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [isVisible]);

    return (
        <div
            className="tooltip-container"
            ref={targetRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {isVisible && (
                <div
                    ref={tooltipRef}
                    className="aws-tooltip"
                    style={{
                        position: 'fixed',
                        left: `${coords.x}px`,
                        top: `${coords.y}px`,
                        zIndex: 9999,
                    }}
                    data-position={position}
                >
                    {content}
                </div>
            )}
        </div>
    );
};

export default Tooltip;