import React from 'react';
import { Stage, Layer } from 'react-konva';
import Canvas from './Canvas';
import Sidebar from './Sidebar';

function CanvasContainer({
                             activeTab,
                             setActiveTab,
                             isLineMode,
                             setIsLineMode,
                             canvasComponents,
                             connections,
                             lineStart,
                             ghostLine,
                             draggingComponent,
                             handleMouseDown,
                             handleMouseMove,
                             handleMouseUp,
                             handleComponentClick,
                             handleDragMove,
                             handleDragEnd,
                             handleClearConnections,
                             handleComponentUpdate,
                             openRenameModal, // New prop
                         }) {
    return (
        <div style={{ position: 'relative' }}>
            <Stage
                width={1000}
                height={400}
                onMouseDown={(e) => handleMouseDown(null, e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <Layer>
                    <Canvas
                        canvasComponents={canvasComponents}
                        connections={connections}
                        isLineMode={isLineMode}
                        lineStart={lineStart}
                        ghostLine={ghostLine}
                        draggingComponent={draggingComponent}
                        handleComponentClick={handleComponentClick}
                        handleDragMove={handleDragMove}
                        handleDragEnd={handleDragEnd}
                    />
                    <Sidebar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isLineMode={isLineMode}
                        setIsLineMode={setIsLineMode}
                        handleMouseDown={handleMouseDown}
                        canvasComponents={canvasComponents}
                        handleComponentUpdate={handleComponentUpdate}
                        lineStart={lineStart}
                        openRenameModal={openRenameModal} // Pass to Sidebar
                    />
                </Layer>
            </Stage>
        </div>
    );
}

export default CanvasContainer;