// src/components/canvas/CanvasGrid.js
import React from 'react';
import { Group, Line, Rect, Text } from 'react-konva';

const CanvasGrid = ({ width, height, scale, showAzs = false, numAzs = 3 }) => {
    // Calculate grid spacing based on scale
    const gridSize = 20;
    const adjustedGridSize = gridSize * scale;

    // Only render grid if scale isn't too small or large
    if (scale < 0.4 || scale > 3) return null;

    // Calculate number of lines needed
    const horizontalLines = Math.ceil(height / adjustedGridSize);
    const verticalLines = Math.ceil(width / adjustedGridSize);

    // Render AZ boundaries if requested
    const azBoundaries = [];
    if (showAzs && numAzs > 1) {
        const azWidth = width / numAzs;

        for (let i = 1; i < numAzs; i++) {
            azBoundaries.push(
                <Line
                    key={`az-${i}`}
                    points={[i * azWidth, 0, i * azWidth, height]}
                    stroke="#9CA3AF"
                    strokeWidth={1 / scale}
                    dash={[6, 3]}
                />
            );

            // Add AZ labels
            azBoundaries.push(
                <Group key={`az-label-${i}`} x={(i - 0.5) * azWidth} y={50}>
                    <Rect
                        width={40}
                        height={20}
                        x={-20}
                        y={-10}
                        fill="#F3F4F6"
                        stroke="#D1D5DB"
                        strokeWidth={1 / scale}
                        opacity={0.8}
                        cornerRadius={4}
                    />
                    <Text
                        text={`AZ-${String.fromCharCode(97 + i - 1)}`}
                        fontSize={12 / scale}
                        fill="#374151"
                        align="center"
                        width={40}
                        x={-20}
                        y={-5}
                    />
                </Group>
            );
        }

        // Add first AZ label
        azBoundaries.push(
            <Group key="az-label-0" x={azWidth * 0.5} y={50}>
                <Rect
                    width={40}
                    height={20}
                    x={-20}
                    y={-10}
                    fill="#F3F4F6"
                    stroke="#D1D5DB"
                    strokeWidth={1 / scale}
                    opacity={0.8}
                    cornerRadius={4}
                />
                <Text
                    text="AZ-a"
                    fontSize={12 / scale}
                    fill="#374151"
                    align="center"
                    width={40}
                    x={-20}
                    y={-5}
                />
            </Group>
        );
    }

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

            {/* AZ boundaries if enabled */}
            {azBoundaries}
        </Group>
    );
};

export default CanvasGrid;