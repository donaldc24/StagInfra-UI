import React from 'react';
import TextEditor from './TextEditor';
import NumberEditor from './NumberEditor';
import SelectEditor from './SelectEditor';
import CheckboxEditor from './CheckboxEditor';

const EditorTypes = {
    text: TextEditor,
    number: NumberEditor,
    select: SelectEditor,
    checkbox: CheckboxEditor
};

const PropertyEditor = ({ definition, value, onChange }) => {
    const EditorComponent = EditorTypes[definition.type];
    if (!EditorComponent) {
        console.warn(`No editor found for type: ${definition.type}`);
        return null;
    }

    return (
        <EditorComponent
            definition={definition}
            value={value}
            onChange={onChange}
        />
    );
};

export default PropertyEditor;