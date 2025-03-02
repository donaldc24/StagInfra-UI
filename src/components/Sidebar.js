import React from 'react';
import { Rect, Text, Group } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTab, setLineMode } from '../store/slices/uiStateSlice';
import { openRenameModal } from '../store/slices/uiStateSlice';
import { updateComponent, selectComponents } from '../store/slices/componentsSlice';
import { awsComponentRegistry } from '../services/awsComponentRegistry';

function Sidebar({ handleMouseDown, lineStart, handleClearConnections }) {
    const dispatch = useDispatch();
    const { activeTab, isLineMode } = useSelector(state => state.uiState);
    const canvasComponents = useSelector(selectComponents);

    const handleMouseEnter = (e) => {
        e.target.scaleX(1.1);
        e.target.scaleY(1.1);
    };

    const handleMouseLeave = (e) => {
        e.target.scaleX(1);
        e.target.scaleY(1);
    };

    const incrementValue = (id, field, delta) => {
        const comp = canvasComponents.find((c) => c?.id === id);
        if (!comp) return;

        const current = field === 'instances' ? comp.instances : comp.storage;
        const min = field === 'instances' ? 1 : 10;
        const max = field === 'instances' ? 10 : 1000;
        const newValue = Math.max(min, Math.min(max, current + delta));

        dispatch(updateComponent({
            id,
            changes: { [field]: newValue }
        }));
    };

    const tabNames = [
        { full: 'Add', short: 'Add...', key: 'add' },
        { full: 'Components', short: 'Com...', key: 'components' },
        { full: 'Tools', short: 'Too...', key: 'tools' },
    ];

    const getTabWidth = (key) => {
        if (activeTab === key) {
            const fullText = tabNames.find((tab) => tab.key === key)?.full;
            return (fullText?.length || 0) * 10 + 10;
        }
        return 40;
    };

    const getTabX = (index) => {
        let x = 0;
        for (let i = 0; i < index; i++) {
            x += getTabWidth(tabNames[i].key);
        }
        return x;
    };

    return (
        <>
            <Rect x={0} y={0} width={240} height={400} fill="white" stroke="gray" strokeWidth={1} />

            {/* Tabs */}
            {tabNames.map((tab, index) => (
                <Group key={tab.key}>
                    <Rect
                        x={getTabX(index)}
                        y={0}
                        width={getTabWidth(tab.key)}
                        height={30}
                        fill={activeTab === tab.key ? '#e0e0e0' : '#f0f0f0'}
                        onClick={() => dispatch(setActiveTab(tab.key))}
                    />
                    <Text
                        x={getTabX(index) + (activeTab === tab.key ? 5 : 5)}
                        y={10}
                        text={activeTab === tab.key ? tab.full : tab.short}
                        fontSize={12}
                        fill="black"
                        listening={false}
                    />
                </Group>
            ))}

            {/* Add Tab Content */}
            {activeTab === 'add' && (
                <>
                    <Rect
                        x={100}
                        y={50}
                        width={40}
                        height={40}
                        fill={awsComponentRegistry.ec2.color || "orange"}
                        onMouseDown={(e) => handleMouseDown('ec2', e)}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        cornerRadius={4}
                    />
                    <Text x={100} y={95} text="EC2" fontSize={12} fill="black" align="center" width={40} />

                    <Rect
                        x={100}
                        y={130}
                        width={40}
                        height={40}
                        fill={awsComponentRegistry.s3.color || "green"}
                        onMouseDown={(e) => handleMouseDown('s3', e)}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        cornerRadius={4}
                    />
                    <Text x={100} y={175} text="S3" fontSize={12} fill="black" align="center" width={40} />
                </>
            )}

            {/* Components Tab Content */}
            {activeTab === 'components' && (
                <>
                    {canvasComponents.length === 0 ? (
                        <Text
                            x={0}
                            y={185}
                            width={240}
                            height={30}
                            text="No components added"
                            fontSize={12}
                            fill="#808080"
                            fontStyle="italic"
                            align="center"
                            verticalAlign="middle"
                        />
                    ) : (
                        canvasComponents.map((comp, index) => {
                            if (!comp || !comp.type || !comp.id) {
                                return null;
                            }

                            const metadata = awsComponentRegistry[comp.type] || {};
                            const displayName = comp.name || metadata.displayName || `${(comp.type || '').toUpperCase()}-${(comp.id || '').slice(-4) || ''}`;

                            return (
                                <Group key={comp.id} y={40 + index * 50}>
                                    <Rect
                                        x={0}
                                        y={0}
                                        width={240}
                                        height={50}
                                        fill={lineStart && lineStart?.id === comp.id ? '#FFFFCC' : 'transparent'}
                                    />
                                    <Text
                                        x={10}
                                        y={0}
                                        text={displayName}
                                        fontSize={14}
                                        fill="black"
                                        fontStyle={lineStart && lineStart?.id === comp.id ? 'bold' : 'normal'}
                                    />
                                    <Text
                                        x={20}
                                        y={20}
                                        text={comp.type === 'ec2' ? 'Instances' : 'Storage (GB)'}
                                        fontSize={12}
                                        fontStyle="bold"
                                        fill="black"
                                    />
                                    <Rect
                                        x={100}
                                        y={20}
                                        width={40}
                                        height={20}
                                        fill="#ffffff"
                                        stroke="#ccc"
                                        strokeWidth={1}
                                    />
                                    <Text
                                        x={105}
                                        y={23}
                                        text={
                                            comp.type === 'ec2'
                                                ? (comp.instances || 0).toString()
                                                : (comp.storage || 0).toString()
                                        }
                                        fontSize={12}
                                        fill="black"
                                        width={30}
                                        align="center"
                                        listening={false}
                                    />
                                    <Rect
                                        x={145}
                                        y={20}
                                        width={15}
                                        height={10}
                                        fill="#ccc"
                                        onClick={() => incrementValue(comp.id, comp.type === 'ec2' ? 'instances' : 'storage', 1)}
                                    />
                                    <Text x={148} y={20} text="▲" fontSize={8} fill="black" listening={false} />
                                    <Rect
                                        x={145}
                                        y={30}
                                        width={15}
                                        height={10}
                                        fill="#ccc"
                                        onClick={() => incrementValue(comp.id, comp.type === 'ec2' ? 'instances' : 'storage', -1)}
                                    />
                                    <Text x={148} y={30} text="▼" fontSize={8} fill="black" listening={false} />
                                    <Rect
                                        x={165}
                                        y={20}
                                        width={60}
                                        height={20}
                                        fill="#e0e0e0"
                                        onClick={() => dispatch(openRenameModal(comp))}
                                    />
                                    <Text
                                        x={170}
                                        y={23}
                                        text="Rename"
                                        fontSize={12}
                                        fill="black"
                                        width={50}
                                        align="center"
                                        listening={false}
                                    />
                                </Group>
                            );
                        })
                    )}
                </>
            )}

            {/* Tools Tab Content */}
            {activeTab === 'tools' && (
                <Group>
                    <Rect
                        x={70}
                        y={50}
                        width={100}
                        height={30}
                        fill={isLineMode ? '#666666' : '#999999'}
                        onClick={() => dispatch(setLineMode(!isLineMode))}
                    />
                    <Text x={95} y={60} text="Line Tool" fontSize={12} fill="white" listening={false} />

                    <Rect
                        x={70}
                        y={100}
                        width={100}
                        height={30}
                        fill="#ff4444"
                        onClick={handleClearConnections}
                    />
                    <Text x={85} y={110} text="Clear Connections" fontSize={12} fill="white" listening={false} />
                </Group>
            )}
        </>
    );
}

export default Sidebar;