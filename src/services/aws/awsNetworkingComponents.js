// src/services/aws/awsNetworkingComponents.js
import { sanitizeResourceName } from '../utils/resourceNameUtils';

/**
 * AWS Networking service component definitions
 */
export const networkingComponents = {
    vpc: {
        type: 'vpc',
        category: 'networking',
        displayName: 'VPC',
        icon: '/icons/vpc.svg',
        color: '#248814', // AWS green
        defaultProperties: {
            cidr_block: '10.0.0.0/16',
            enableDnsSupport: true,
            enableDnsHostnames: true
        },
        propertyEditors: [
            { type: 'text', key: 'cidr_block', label: 'CIDR Block' },
            { type: 'checkbox', key: 'enableDnsSupport', label: 'DNS Support' },
            { type: 'checkbox', key: 'enableDnsHostnames', label: 'DNS Hostnames' }
        ],
        allowedConnections: ['subnet', 'internetGateway', 'natGateway'],
        // VPCs are containers for subnets - EXPLICIT containment definition
        isContainer: true,
        canContain: ['subnet'],
        size: { width: 300, height: 250 },
        terraformTemplate: (component) => `
resource "aws_vpc" "${sanitizeResourceName(component.name || `vpc-${component.id.slice(-4)}`)}" {
  cidr_block           = "${component.cidr_block || '10.0.0.0/16'}"
  enable_dns_support   = ${component.enableDnsSupport !== false}
  enable_dns_hostnames = ${component.enableDnsHostnames !== false}
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: () => {
            // VPC itself is free
            return 0;
        }
    },

    subnet: {
        type: 'subnet',
        category: 'networking',
        displayName: 'Subnet',
        icon: '/icons/subnet.svg',
        color: '#34A853', // Lighter green
        defaultProperties: {
            cidr_block: '10.0.1.0/24',
            availability_zone: 'us-west-2a',
            public: true
        },
        propertyEditors: [
            { type: 'text', key: 'cidr_block', label: 'CIDR Block' },
            {
                type: 'select',
                key: 'availability_zone',
                label: 'Availability Zone',
                options: [
                    { value: 'us-west-2a', label: 'us-west-2a' },
                    { value: 'us-west-2b', label: 'us-west-2b' },
                    { value: 'us-west-2c', label: 'us-west-2c' }
                ]
            },
            { type: 'checkbox', key: 'public', label: 'Public Subnet' }
        ],
        allowedConnections: ['ec2', 'rds', 'elasticache', 'lambda'],
        // Subnets are containers for resources, and MUST be contained by VPCs
        isContainer: true,
        canContain: ['ec2', 'rds', 'elasticache', 'lambda'],
        mustBeContainedBy: ['vpc'], // EXPLICIT containment requirement
        size: { width: 200, height: 150 },
        terraformTemplate: (component, parentVpc) => `
resource "aws_subnet" "${sanitizeResourceName(component.name || `subnet-${component.id.slice(-4)}`)}" {
  vpc_id                  = ${parentVpc ? `aws_vpc.${sanitizeResourceName(parentVpc.name || `vpc-${parentVpc.id.slice(-4)}`)}.id` : "aws_vpc.main.id"}
  cidr_block              = "${component.cidr_block || '10.0.1.0/24'}"
  availability_zone       = "${component.availability_zone || 'us-west-2a'}"
  map_public_ip_on_launch = ${component.public !== false}
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: () => {
            // Subnets are free
            return 0;
        }
    },

    securityGroup: {
        type: 'securityGroup',
        category: 'networking',
        displayName: 'Security Group',
        icon: '/icons/security-group.svg',
        color: '#4285F4', // Blue
        defaultProperties: {
            name: '',
            description: 'Security group created via Cloud Design Tool'
        },
        propertyEditors: [
            { type: 'text', key: 'name', label: 'Name' },
            { type: 'text', key: 'description', label: 'Description' }
        ],
        allowedConnections: ['ec2', 'rds', 'elasticache', 'loadBalancer'],
        size: { width: 40, height: 40 },
        terraformTemplate: (component, parentVpc) => `
resource "aws_security_group" "${sanitizeResourceName(component.name || `sg-${component.id.slice(-4)}`)}" {
  name        = "${component.name || `sg-${component.id.slice(-4)}`}"
  description = "${component.description || 'Security group created via Cloud Design Tool'}"
  vpc_id      = ${parentVpc ? `aws_vpc.${sanitizeResourceName(parentVpc.name || `vpc-${parentVpc.id.slice(-4)}`)}.id` : "aws_vpc.main.id"}
  
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all inbound traffic (for demo purposes only)"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: () => {
            // Security Groups are free
            return 0;
        }
    },

    loadBalancer: {
        type: 'loadBalancer',
        category: 'networking',
        displayName: 'Load Balancer',
        icon: '/icons/elb.svg',
        color: '#248814', // AWS green
        defaultProperties: {
            lb_type: 'application',
            internal: false
        },
        propertyEditors: [
            {
                type: 'select',
                key: 'lb_type',
                label: 'Type',
                options: [
                    { value: 'application', label: 'Application Load Balancer' },
                    { value: 'network', label: 'Network Load Balancer' },
                    { value: 'classic', label: 'Classic Load Balancer' }
                ]
            },
            { type: 'checkbox', key: 'internal', label: 'Internal' }
        ],
        allowedConnections: ['ec2'],
        // Load balancers must be in subnets
        mustBeContainedBy: ['subnet'],
        size: { width: 40, height: 40 },
        terraformTemplate: (component, parentSubnet, securityGroups) => `
resource "aws_lb" "${sanitizeResourceName(component.name || `lb-${component.id.slice(-4)}`)}" {
  name               = "${component.name || `lb-${component.id.slice(-4)}`}"
  internal           = ${component.internal || false}
  load_balancer_type = "${component.lb_type || 'application'}"
  ${securityGroups && securityGroups.length > 0 ? `security_groups    = [${securityGroups.map(sg => `aws_security_group.${sanitizeResourceName(sg.name || `sg-${sg.id.slice(-4)}`)}.id`).join(', ')}]` : ''}
  subnets            = [${parentSubnet ? `aws_subnet.${sanitizeResourceName(parentSubnet.name || `subnet-${parentSubnet.id.slice(-4)}`)}.id` : ''}]
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // ALB: $0.0225 per hour + $0.008 per LCU-hour
            // NLB: $0.0225 per hour + $0.006 per LCU-hour
            // CLB: $0.025 per hour
            let hourlyCost = 0;

            switch (props.lb_type) {
                case 'application':
                    hourlyCost = 0.0225 + (0.008 * 3); // Assuming 3 LCU average
                    break;
                case 'network':
                    hourlyCost = 0.0225 + (0.006 * 3); // Assuming 3 LCU average
                    break;
                case 'classic':
                default:
                    hourlyCost = 0.025;
            }

            return hourlyCost * 730; // 730 hours in a month
        }
    }
};

export default networkingComponents;