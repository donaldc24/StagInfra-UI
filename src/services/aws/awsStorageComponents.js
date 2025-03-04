// src/services/aws/awsStorageComponents.js
import { sanitizeResourceName } from '../utils/resourceNameUtils';

/**
 * AWS Storage service component definitions
 */
export const storageComponents = {
    s3: {
        type: 's3',
        category: 'storage',
        displayName: 'S3 Bucket',
        icon: '/icons/s3.svg',
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
        // S3 buckets are global and not tied to VPC/subnets
        size: { width: 40, height: 40 },
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
}

${component.public_access ? `
resource "aws_s3_bucket_public_access_block" "${sanitizeResourceName(component.name || `s3-${component.id.slice(-4)}`)}_public_access" {
  bucket = aws_s3_bucket.${sanitizeResourceName(component.name || `s3-${component.id.slice(-4)}`)}.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}` : ''}`.trim(),
        costCalculation: (props) => {
            // Standard S3 pricing is approximately $0.023 per GB
            return 0.023 * (props.storage || 10);
        }
    },

    ebs: {
        type: 'ebs',
        category: 'storage',
        displayName: 'EBS Volume',
        icon: '/icons/ebs.svg',
        color: '#16a34a', // Green like other storage
        defaultProperties: {
            size: 20,
            volume_type: 'gp2',
            iops: 100
        },
        propertyEditors: [
            { type: 'number', key: 'size', label: 'Size (GB)', min: 1, max: 16384 },
            {
                type: 'select',
                key: 'volume_type',
                label: 'Volume Type',
                options: [
                    { value: 'gp2', label: 'General Purpose (gp2)' },
                    { value: 'gp3', label: 'General Purpose (gp3)' },
                    { value: 'io1', label: 'Provisioned IOPS (io1)' },
                    { value: 'st1', label: 'Throughput Optimized (st1)' },
                    { value: 'sc1', label: 'Cold Storage (sc1)' }
                ]
            },
            { type: 'number', key: 'iops', label: 'IOPS', min: 100, max: 64000 }
        ],
        allowedConnections: ['ec2'],
        // EBS volumes must be in a subnet
        canBeContainedBy: ['subnet'],
        size: { width: 40, height: 40 },
        terraformTemplate: (component, parentSubnet, securityGroups) => `
resource "aws_ebs_volume" "${sanitizeResourceName(component.name || `ebs-${component.id.slice(-4)}`)}" {
  availability_zone = "${parentSubnet ? parentSubnet.availability_zone || 'us-west-2a' : 'us-west-2a'}"
  size              = ${component.size || 20}
  type              = "${component.volume_type || 'gp2'}"
  ${component.volume_type === 'io1' ? `iops = ${component.iops || 100}` : ''}
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // EBS pricing by volume type
            const volumePricing = {
                'gp2': 0.10,  // $0.10 per GB-month
                'gp3': 0.08,  // $0.08 per GB-month
                'io1': 0.125, // $0.125 per GB-month
                'st1': 0.045, // $0.045 per GB-month
                'sc1': 0.025  // $0.025 per GB-month
            };

            const volumeType = props.volume_type || 'gp2';
            const size = props.size || 20;
            let total = size * (volumePricing[volumeType] || 0.10);

            // Add IOPS cost for io1 volumes
            if (volumeType === 'io1') {
                const iops = props.iops || 100;
                total += iops * 0.065; // $0.065 per provisioned IOPS-month
            }

            return total;
        }
    }
};

export default storageComponents;