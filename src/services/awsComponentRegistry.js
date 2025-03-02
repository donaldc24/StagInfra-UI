// src/services/awsComponentRegistry.js

export const awsComponentRegistry = {
    ec2: {
        type: 'ec2',
        category: 'compute',
        displayName: 'EC2 Instance',
        icon: '/icons/ec2.svg', // This would be the path to your EC2 icon
        color: '#FF9900', // AWS orange
        defaultProperties: {
            instance_type: 't2.micro',
            ami: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2 AMI (example)
            instances: 1,
            ebs_volume_size: 8,
            ebs_volume_type: 'gp2'
        },
        propertyEditors: [
            {
                type: 'select',
                key: 'instance_type',
                label: 'Instance Type',
                options: [
                    { value: 't2.nano', label: 't2.nano (0.5 GiB)' },
                    { value: 't2.micro', label: 't2.micro (1 GiB)' },
                    { value: 't2.small', label: 't2.small (2 GiB)' },
                    { value: 't2.medium', label: 't2.medium (4 GiB)' },
                    { value: 't2.large', label: 't2.large (8 GiB)' }
                ]
            },
            { type: 'number', key: 'instances', label: 'Instance Count', min: 1, max: 20 },
            { type: 'text', key: 'ami', label: 'AMI ID' },
            { type: 'number', key: 'ebs_volume_size', label: 'EBS Volume Size (GB)', min: 8, max: 16384 }
        ],
        allowedConnections: ['s3', 'rds', 'dynamodb', 'elasticache', 'vpc', 'securityGroup', 'loadBalancer'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_instance" "${sanitizeResourceName(component.name || `ec2-${component.id.slice(-4)}`)}" {
  count         = ${component.instances || 1}
  ami           = "${component.ami || 'ami-12345678'}"
  instance_type = "${component.instance_type || 't2.micro'}"
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // This would be replaced with actual pricing data
            const instanceTypeCosts = {
                't2.nano': 5.0,
                't2.micro': 8.5,
                't2.small': 17.0,
                't2.medium': 34.0,
                't2.large': 68.0
            };
            return (instanceTypeCosts[props.instance_type] || 8.5) * (props.instances || 1);
        }
    },

    s3: {
        type: 's3',
        category: 'storage',
        displayName: 'S3 Bucket',
        icon: '/icons/s3.svg', // This would be the path to your S3 icon
        color: '#3F8624', // AWS green
        defaultProperties: {
            storage: 10, // GB
            bucket_name: '',
            versioning: false,
            public_access: false
        },
        propertyEditors: [
            { type: 'text', key: 'bucket_name', label: 'Bucket Name' },
            { type: 'number', key: 'storage', label: 'Storage Estimate (GB)', min: 1 },
            { type: 'checkbox', key: 'versioning', label: 'Enable Versioning' },
            { type: 'checkbox', key: 'public_access', label: 'Public Access' }
        ],
        allowedConnections: ['ec2', 'lambda', 'cloudfront'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_s3_bucket" "${sanitizeResourceName(component.name || `s3-${component.id.slice(-4)}`)}" {
  bucket = "${component.bucket_name || `${component.name || component.id}-bucket`}"
  versioning {
    enabled = ${component.versioning || false}
  }
  tags = {
    Name = "${component.name || component.id}"
    EstimatedStorage = "${component.storage || 10} GB"
  }
}`.trim(),
        costCalculation: (props) => {
            // Standard S3 pricing is approximately $0.023 per GB
            return 0.023 * (props.storage || 10);
        }
    }

    // Additional AWS components would be added here
};

// Helper functions
export const getComponentMetadata = (type) => {
    return awsComponentRegistry[type] || null;
};

export const getDefaultProperties = (type) => {
    const metadata = getComponentMetadata(type);
    return metadata ? { ...metadata.defaultProperties } : {};
};

export const sanitizeResourceName = (name) => {
    // Terraform resource names must be alphanumeric or underscores
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
};

export const getComponentCategories = () => {
    const categories = {};
    Object.values(awsComponentRegistry).forEach(component => {
        if (!categories[component.category]) {
            categories[component.category] = [];
        }
        categories[component.category].push(component.type);
    });
    return categories;
};

export const validateConnection = (sourceType, targetType) => {
    const sourceMetadata = getComponentMetadata(sourceType);
    if (!sourceMetadata) return false;

    return sourceMetadata.allowedConnections.includes(targetType);
};