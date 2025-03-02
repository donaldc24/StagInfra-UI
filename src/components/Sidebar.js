// src/components/Sidebar.js
import React from 'react';
import { Rect, Text, Group } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveTab, setLineMode } from '../store/slices/uiStateSlice';
import { openRenameModal } from '../store/slices/uiStateSlice';
import { updateComponent, selectComponents } from '../store/slices/componentsSlice';
import { getComponentCategories, awsComponentRegistry } from '../services/awsComponentRegistry';

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

        const current = comp[field] !== undefined ? comp[field] : 0;

        // Get min/max values from component metadata if available
        const metadata = awsComponentRegistry[comp.type];
        const propertyDef = metadata?.propertyEditors?.find(p => p.key === field);

        const min = propertyDef?.min || 0;
        const max = propertyDef?.max || 9999;

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

    // Get categories and component types for the Add tab
    const categories = getComponentCategories();

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
                <Group y={40}>
                    {Object.entries(categories).map(([category, componentTypes], catIndex) => (
                        <Group key={category} y={catIndex * 100}>
                            <Text
                                x={10}
                                y={0}
                                text={category.charAt(0).toUpperCase() + category.slice(1)}
                                fontSize={14}
                                fontStyle="bold"
                                fill="#333"
                            />
                            <Group y={20}>
                                {componentTypes.map((type, typeIndex) => {
                                    const component = awsComponentRegistry[type];
                                    const row = Math.floor(typeIndex / 2);
                                    const col = typeIndex % 2;
                                    return (
                                        <Group key={type} x={10 + col * 110} y={row * 70}>
                                            <Rect
                                                width={40}
                                                height={40}
                                                fill={component.color}
                                                cornerRadius={4}
                                                onMouseDown={(e) => handleMouseDown(type, e)}
                                                onMouseEnter={handleMouseEnter}
                                                onMouseLeave={handleMouseLeave}
                                            />
                                            <Text
                                                x={0}
                                                y={45}
                                                text={component.displayName}
                                                fontSize={12}
                                                fill="#333"
                                                width={90}
                                                align="center"
                                            />
                                        </Group>
                                    );
                                })}
                            </Group>
                        </Group>
                    ))}
                </Group>
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

                            // Determine which properties to show based on component type
                            const propertiesToShow = metadata.propertyEditors
                                ? metadata.propertyEditors.slice(0, 2) // Show top 2 properties
                                : [];

                            return (
                                <Group key={comp.id} y={40 + index * (70 + propertiesToShow.length * 20)}>
                                    <Rect
                                        x={0}
                                        y={0}
                                        width={240}
                                        height={60 + propertiesToShow.length * 20}
                                        fill={lineStart && lineStart?.id === comp.id ? '#FFFFCC' : 'transparent'}
                                        stroke="#eee"
                                        strokeWidth={1}
                                    />
                                    <Group x={10} y={10}>
                                        <Rect
                                            width={20}
                                            height={20}
                                            fill={metadata.color || comp.fill}
                                            cornerRadius={2}
                                        />
                                        <Text
                                            x={30}
                                            y={2}
                                            text={displayName}
                                            fontSize={14}
                                            fontStyle="bold"
                                            fill="black"
                                        />
                                    </Group>

                                    {/* Property editors */}
                                    {propertiesToShow.map((propDef, propIndex) => {
                                        const propValue = comp[propDef.key] !== undefined
                                            ? comp[propDef.key]
                                            : metadata.defaultProperties[propDef.key];

                                        return (
                                            <Group key={propDef.key} y={35 + propIndex * 20}>
                                                <Text
                                                    x={20}
                                                    y={0}
                                                    text={propDef.label}
                                                    fontSize={12}
                                                    fontStyle="normal"
                                                    fill="#666"
                                                    width={100}
                                                />

                                                <Rect
                                                    x={120}
                                                    y={0}
                                                    width={40}
                                                    height={16}
                                                    fill="#ffffff"
                                                    stroke="#ccc"
                                                    strokeWidth={1}
                                                />

                                                <Text
                                                    x={125}
                                                    y={1}
                                                    text={propValue?.toString() || ''}
                                                    fontSize={12}
                                                    fill="black"
                                                    width={30}
                                                />

                                                {propDef.type === 'number' && (
                                                    <Group>
                                                        <Rect
                                                            x={165}
                                                            y={0}
                                                            width={15}
                                                            height={8}
                                                            fill="#ccc"
                                                            onClick={() => incrementValue(comp.id, propDef.key, 1)}
                                                        />
                                                        <Text x={168} y={-2} text="▲" fontSize={8} fill="black" listening={false} />

                                                        <Rect
                                                            x={165}
                                                            y={8}
                                                            width={15}
                                                            height={8}
                                                            fill="#ccc"
                                                            onClick={() => incrementValue(comp.id, propDef.key, -1)}
                                                        />
                                                        <Text x={168} y={6} text="▼" fontSize={8} fill="black" listening={false} />
                                                    </Group>
                                                )}
                                            </Group>
                                        );
                                    })}

                                    {/* Rename button */}
                                    <Rect
                                        x={165}
                                        y={10}
                                        width={60}
                                        height={20}
                                        fill="#e0e0e0"
                                        onClick={() => dispatch(openRenameModal(comp))}
                                    />
                                    <Text
                                        x={170}
                                        y={13}
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
                <Group y={50}>
                    <Rect
                        x={70}
                        y={0}
                        width={100}
                        height={30}
                        fill={isLineMode ? '#666666' : '#999999'}
                        onClick={() => dispatch(setLineMode(!isLineMode))}
                        cornerRadius={4}
                    />
                    <Text
                        x={95}
                        y={8}
                        text="Line Tool"
                        fontSize={12}
                        fill="white"
                        align="center"
                        width={50}
                        listening={false}
                    />

                    <Rect
                        x={70}
                        y={50}
                        width={100}
                        height={30}
                        fill="#ff4444"
                        onClick={handleClearConnections}
                        cornerRadius={4}
                    />
                    <Text
                        x={70}
                        y={58}
                        text="Clear Connections"
                        fontSize={12}
                        fill="white"
                        align="center"
                        width={100}
                        listening={false}
                    />

                    <Group y={100}>
                        <Text
                            x={0}
                            y={0}
                            text="Connection Instructions:"
                            fontSize={14}
                            fontStyle="bold"
                            fill="#333"
                            width={240}
                            padding={10}
                        />
                        <Text
                            x={0}
                            y={20}
                            text="1. Click 'Line Tool' to activate\n2. Click source component\n3. Click target component\n\nOnly valid connections will be created."
                            fontSize={12}
                            fill="#333"
                            width={240}
                            padding={10}
                            lineHeight={1.5}
                        />
                    </Group>
                </Group>
            )}
        </>
    );
}

export default Sidebar;