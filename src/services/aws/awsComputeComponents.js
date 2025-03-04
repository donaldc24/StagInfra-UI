// src/services/aws/awsComputeComponents.js
import { sanitizeResourceName } from '../utils/resourceNameUtils';

/**
 * AWS Compute service component definitions
 */
export const computeComponents = {
    ec2: {
        type: 'ec2',
        category: 'compute',
        displayName: 'EC2 Instance',
        icon: '/icons/ec2.svg',
        color: '#FF9900', // AWS orange
        defaultProperties: {
            instance_type: 't2.micro',
            ami: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2 AMI
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
        allowedConnections: ['s3', 'rds', 'dynamodb', 'elasticache', 'securityGroup', 'loadBalancer'],
        // EC2 instances must be in a subnet
        mustBeContainedBy: ['subnet'],
        size: { width: 40, height: 40 },
        terraformTemplate: (component, parentSubnet, securityGroups) => `
resource "aws_instance" "${sanitizeResourceName(component.name || `ec2-${component.id.slice(-4)}`)}" {
  count         = ${component.instances || 1}
  ami           = "${component.ami || 'ami-12345678'}"
  instance_type = "${component.instance_type || 't2.micro'}"
  ${parentSubnet ? `subnet_id     = aws_subnet.${sanitizeResourceName(parentSubnet.name || `subnet-${parentSubnet.id.slice(-4)}`)}.id` : ''}
  ${securityGroups && securityGroups.length > 0 ? `vpc_security_group_ids = [${securityGroups.map(sg => `aws_security_group.${sanitizeResourceName(sg.name || `sg-${sg.id.slice(-4)}`)}.id`).join(', ')}]` : ''}
  
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

    lambda: {
        type: 'lambda',
        category: 'compute',
        displayName: 'Lambda Function',
        icon: '/icons/lambda.svg',
        color: '#FF9900', // AWS orange
        defaultProperties: {
            runtime: 'nodejs14.x',
            memory: 128,
            timeout: 3,
            handler: 'index.handler'
        },
        propertyEditors: [
            {
                type: 'select',
                key: 'runtime',
                label: 'Runtime',
                options: [
                    { value: 'nodejs14.x', label: 'Node.js 14.x' },
                    { value: 'python3.9', label: 'Python 3.9' },
                    { value: 'java11', label: 'Java 11' },
                    { value: 'go1.x', label: 'Go 1.x' }
                ]
            },
            { type: 'number', key: 'memory', label: 'Memory (MB)', min: 128, max: 10240, step: 64 },
            { type: 'number', key: 'timeout', label: 'Timeout (sec)', min: 1, max: 900 },
            { type: 'text', key: 'handler', label: 'Handler' }
        ],
        allowedConnections: ['s3', 'dynamodb', 'apiGateway', 'eventBridge'],
        // Lambda functions can optionally be in a VPC subnet
        canBeContainedBy: ['subnet'],
        size: { width: 40, height: 40 },
        terraformTemplate: (component, parentSubnet) => `
resource "aws_lambda_function" "${sanitizeResourceName(component.name || `lambda-${component.id.slice(-4)}`)}" {
  function_name = "${component.name || `lambda-${component.id.slice(-4)}`}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "${component.handler || 'index.handler'}"
  runtime       = "${component.runtime || 'nodejs14.x'}"
  memory_size   = ${component.memory || 128}
  timeout       = ${component.timeout || 3}
  ${parentSubnet ? `
  vpc_config {
    subnet_ids         = [aws_subnet.${sanitizeResourceName(parentSubnet.name || `subnet-${parentSubnet.id.slice(-4)}`)}.id]
    security_group_ids = []
  }` : ''}
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // Lambda pricing: $0.0000166667 per GB-second
            // Assuming 100,000 invocations per month, 500ms average duration
            const memory = props.memory || 128;
            const memoryGB = memory / 1024;
            const durationSeconds = 0.5; // average duration
            const invocations = 100000; // assumed monthly invocations

            const computeCost = 0.0000166667 * memoryGB * durationSeconds * invocations;
            const requestCost = 0.20 * (invocations / 1000000); // $0.20 per 1M requests

            return computeCost + requestCost;
        }
    }
};

export default computeComponents;