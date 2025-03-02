import React from 'react';
import { Rect, Text, Group } from 'react-konva';

function ClearButton({ handleClearConnections }) {
    return (
        <Group>
            <Rect
                x={850}
                y={300}
                width={100}
                height={30}
                fill="#ff4444"
                onClick={handleClearConnections}
            />
            <Text x={885} y={310} text="Clear" fontSize={12} fill="white" listening={false} />
        </Group>
    );
}

export default ClearButton;