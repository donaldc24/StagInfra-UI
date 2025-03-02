import React from 'react';
import { Rect, Line, Text } from 'react-konva';

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
            <Rect x={200} y={0} width={600} height={400} fill="#F5F5F5" stroke="black" strokeWidth={1} />
            <Rect x={800} y={0} width={200} height={400} fill="white" stroke="gray" strokeWidth={1} />
            <Rect x={800} y={0} width={200} height={200} fill="#ffcccc" stroke="red" strokeWidth={2} />
            <Text x={875} y={90} text="Trash" fontSize={16} fill="red" align="center" width={50} />
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
            {isLineMode && lineStart && ghostLine && (
                <Line
                    points={ghostLine.points}
                    stroke="black"
                    strokeWidth={2}
                    opacity={0.5}
                />
            )}
            {canvasComponents.map(comp => (
                <Rect
                    key={comp.id}
                    x={comp.x}
                    y={comp.y}
                    width={comp.width}
                    height={comp.height}
                    fill={comp.fill}
                    draggable={comp.draggable}
                    onClick={(e) => handleComponentClick(comp, e)}
                    onDragMove={(e) => handleDragMove(e, comp.id)}
                    onDragEnd={(e) => handleDragEnd(e, comp.id)}
                />
            ))}
            {draggingComponent && (
                <Rect
                    x={draggingComponent.x}
                    y={draggingComponent.y}
                    width={draggingComponent.width}
                    height={draggingComponent.height}
                    fill={draggingComponent.fill}
                    opacity={draggingComponent.opacity}
                />
            )}
        </>
    );
}

export default Canvas;