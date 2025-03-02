import React, { useState } from 'react';
import '../styles/GenerateTerraform.css'; // Optional

const GenerateTerraform = ({ canvasComponents }) => {
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const sanitizeResourceName = (name) => {
        // Terraform resource names must be alphanumeric or underscores
        return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    };

    const resourceTemplates = {
        ec2: (comp) => `
resource "aws_instance" "${sanitizeResourceName(comp.name || `ec2-${comp.id.slice(-4)}`)}" {
  count         = ${comp.instances || 1}
  ami           = "${comp.ami || 'ami-12345678'}"
  instance_type = "${comp.instance_type || 't2.micro'}"
  tags = {
    Name = "${comp.name || comp.id}"
  }
}`.trim(),
        s3: (comp) => `
resource "aws_s3_bucket" "${sanitizeResourceName(comp.name || `s3-${comp.id.slice(-4)}`)}" {
  bucket = "${comp.bucket_name || `${comp.name || comp.id}-bucket`}"
  tags = {
    Name            = "${comp.name || comp.id}"
    intended_storage = "${comp.storage || 10} GB"
  }
}`.trim(),
    };

    const generateTerraformCode = () => {
        if (!canvasComponents.length) {
            return '// No components added to the canvas yet.';
        }

        const terraformCode = canvasComponents
            .map((component) => {
                const template = resourceTemplates[component.type];
                if (template) {
                    return template(component);
                }
                return `// Unsupported component type: ${component.type}`;
            })
            .join('\n\n');

        return terraformCode;
    };

    const handleCopyToClipboard = async () => {
        const code = generateTerraformCode();
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <button
                style={{
                    width: '100px',
                    height: '30px',
                    backgroundColor: 'blue',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    margin: '20px auto',
                    display: 'block',
                }}
                onClick={() => setShowModal(true)}
            >
                Generate Terraform
            </button>

            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'white',
                        border: '1px solid gray',
                        width: '400px',
                        height: '300px',
                        padding: '20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                    }}
                >
                    <div style={{ height: '220px', overflowY: 'auto' }}>
            <pre style={{ margin: '0', whiteSpace: 'pre-wrap' }}>
              {generateTerraformCode()}
            </pre>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                        <button
                            onClick={handleCopyToClipboard}
                            style={{ padding: '8px 16px', cursor: 'pointer' }}
                        >
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                        </button>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ padding: '8px 16px', cursor: 'pointer' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default GenerateTerraform;