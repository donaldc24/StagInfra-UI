// src/services/terraformGeneration.js
import { awsComponentRegistry, sanitizeResourceName } from './awsComponentRegistry';

export const generateTerraform = (components, connections) => {
    if (!components.length) {
        return '// No components added to the canvas yet.';
    }

    // Organize components by type for module creation
    const componentsByType = components.reduce((acc, component) => {
        const type = component.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(component);
        return acc;
    }, {});

    // Generate provider block
    const providerBlock = `
provider "aws" {
  region = "us-west-2"
}
`.trim();

    // Generate resource blocks
    const resourceBlocks = components.map(component => {
        const metadata = awsComponentRegistry[component.type];
        if (!metadata || !metadata.terraformTemplate) {
            return `// Unsupported component type: ${component.type}`;
        }
        return metadata.terraformTemplate(component);
    }).join('\n\n');

    // Generate dependency blocks from connections
    const dependencyBlocks = generateDependencyBlocks(components, connections);

    // Generate variables
    const variables = generateVariables(components);

    // Generate outputs
    const outputs = generateOutputs(components);

    // Combine all sections
    return [
        '# AWS Infrastructure',
        providerBlock,
        variables,
        resourceBlocks,
        dependencyBlocks,
        outputs
    ].filter(Boolean).join('\n\n');
};

const generateDependencyBlocks = (components, connections) => {
    if (!connections || connections.length === 0) {
        return '';
    }

    // Example implementation - this would depend on your connection model
    // and how you want to represent dependencies in Terraform
    const blocks = [];

    // For each connection, find the components and generate appropriate references
    connections.forEach(conn => {
        const sourceComp = components.find(c => c.id === conn.from);
        const targetComp = components.find(c => c.id === conn.to);

        if (!sourceComp || !targetComp) return;

        // Example: For EC2 to S3 connections, we might generate an IAM role
        if (sourceComp.type === 'ec2' && targetComp.type === 's3') {
            const roleName = `${sanitizeResourceName(sourceComp.name || sourceComp.id)}_s3_access`;
            const bucketName = sanitizeResourceName(targetComp.name || targetComp.id);

            blocks.push(`
# IAM role for EC2 to access S3
resource "aws_iam_role" "${roleName}" {
  name = "${roleName}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "${roleName}_policy" {
  name = "${roleName}_policy"
  role = aws_iam_role.${roleName}.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Effect = "Allow"
        Resource = [
          aws_s3_bucket.${bucketName}.arn,
          "\${aws_s3_bucket.${bucketName}.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "${roleName}_profile" {
  name = "${roleName}_profile"
  role = aws_iam_role.${roleName}.name
}
`.trim());
        }
    });

    return blocks.join('\n\n');
};

const generateVariables = (components) => {
    // Extract common values that should be variables
    const variableSet = new Set();
    components.forEach(component => {
        // Add component-specific variables
        if (component.type === 'ec2' && component.instance_type) {
            variableSet.add('instance_type');
        }
    });

    if (variableSet.size === 0) return '';

    // Generate variable blocks
    const variables = Array.from(variableSet).map(varName => {
        switch (varName) {
            case 'instance_type':
                return `
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}`.trim();
            default:
                return '';
        }
    }).filter(Boolean).join('\n\n');

    return variables;
};

const generateOutputs = (components) => {
    // Generate useful outputs
    const outputBlocks = [];

    // Add component-specific outputs
    components.forEach(component => {
        if (component.type === 'ec2') {
            const resourceName = sanitizeResourceName(component.name || `ec2-${component.id.slice(-4)}`);
            outputBlocks.push(`
output "${resourceName}_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.${resourceName}.*.public_ip
}`.trim());
        } else if (component.type === 's3') {
            const resourceName = sanitizeResourceName(component.name || `s3-${component.id.slice(-4)}`);
            outputBlocks.push(`
output "${resourceName}_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.${resourceName}.bucket
}`.trim());
        }
    });

    if (outputBlocks.length === 0) return '';
    return outputBlocks.join('\n\n');
};