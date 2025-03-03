// src/components/canvas/CanvasGrid.js
import React from 'react';
import { Group, Line } from 'react-konva';

const CanvasGrid = ({ width, height, scale }) => {
    // Calculate grid spacing based on scale
    const gridSize = 20;
    const adjustedGridSize = gridSize * scale;

    // Only render grid if scale isn't too small or large
    if (scale < 0.4 || scale > 3) return null;

    // Calculate number of lines needed
    const horizontalLines = Math.ceil(height / adjustedGridSize);
    const verticalLines = Math.ceil(width / adjustedGridSize);

    return (
        <Group>
            {/* Horizontal grid lines */}
            {Array.from({ length: horizontalLines }, (_, i) => (
                <Line
                    key={`h-${i}`}
                    points={[0, i * gridSize, width / scale, i * gridSize]}
                    stroke="#e5e7eb"
                    strokeWidth={0.5 / scale}
                />
            ))}

            {/* Vertical grid lines */}
            {Array.from({ length: verticalLines }, (_, i) => (
                <Line
                    key={`v-${i}`}
                    points={[i * gridSize, 0, i * gridSize, height / scale]}
                    stroke="#e5e7eb"
                    strokeWidth={0.5 / scale}
                />
            ))}
        </Group>
    );
};

export default CanvasGrid;