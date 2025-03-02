import React from 'react';
import { Rect, Line, Text } from 'react-konva';
import AwsIcon from './AwsIcon';

function Canvas({
                    canvasComponents,
                    connections,
                    isLineMode,
                    lineStart,
                    ghostLine,
                    draggingComponent,
                    handleComponentClick,
                    handleDragMove,
                    handleDragEnd
                }) {
    return (
        <>
            {/* Canvas area */}
            <Rect x={200} y={0} width={600} height={400} fill="#F5F5F5" stroke="black" strokeWidth={1} />

            {/* Right sidebar area */}
            <Rect x={800} y={0} width={200} height={400} fill="white" stroke="gray" strokeWidth={1} />

            {/* Trash area */}
            <Rect x={800} y={0} width={200} height={200} fill="#ffcccc" stroke="red" strokeWidth={2} />
            <Text x={875} y={90} text="Trash" fontSize={16} fill="red" align="center" width={50} />

            {/* Connection lines */}
            {connections.map((conn, index) => {
                const fromComp = canvasComponents.find(c => c.id === conn.from);
                const toComp = canvasComponents.find(c => c.id === conn.to);
                if (fromComp && toComp) {
                    return (
                        <Line
                            key={index}
                            points={[
                                fromComp.x + fromComp.width / 2,
                                fromComp.y + fromComp.height / 2,
                                toComp.x + toComp.width / 2,
                                toComp.y + toComp.height / 2
                            ]}
                            stroke="black"
                            strokeWidth={2}
                        />
                    );
                }
                return null;
            })}

            {/* Ghost line for when creating a connection */}
            {isLineMode && lineStart && ghostLine && (
                <Line
                    points={ghostLine.points}
                    stroke="black"
                    strokeWidth={2}
                    opacity={0.5}
                    dash={[5, 5]}
                />
            )}

            {/* Component icons */}
            {canvasComponents.map(comp => (
                <AwsIcon
                    key={comp.id}
                    component={comp}
                    onClick={(e) => handleComponentClick(comp, e)}
                    onDragMove={(e) => handleDragMove(e, comp.id)}
                    onDragEnd={(e) => handleDragEnd(e, comp.id)}
                    isSelected={lineStart && lineStart.id === comp.id}
                />
            ))}

            {/* Dragging component preview */}
            {draggingComponent && (
                <Rect
                    x={draggingComponent.x - 20}  // Center on cursor
                    y={draggingComponent.y - 20}
                    width={40}
                    height={40}
                    fill={draggingComponent.fill}
                    opacity={0.5}
                    stroke="#333"
                    strokeWidth={1}
                    dash={[5, 5]}
                />
            )}
        </>
    );
}

export default Canvas;