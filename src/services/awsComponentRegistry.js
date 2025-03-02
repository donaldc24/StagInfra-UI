// src/services/awsComponentRegistry.js

export const awsComponentRegistry = {
    // Compute Services
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
        allowedConnections: ['s3', 'rds', 'dynamodb', 'elasticache', 'vpc', 'subnet', 'securityGroup', 'loadBalancer'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_instance" "${sanitizeResourceName(component.name || `ec2-${component.id.slice(-4)}`)}" {
  count         = ${component.instances || 1}
  ami           = "${component.ami || 'ami-12345678'}"
  instance_type = "${component.instance_type || 't2.micro'}"
  ${component.subnet_id ? `subnet_id     = "${component.subnet_id}"` : ''}
  ${component.security_groups ? `vpc_security_group_ids = ${JSON.stringify(component.security_groups)}` : ''}
  
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
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_lambda_function" "${sanitizeResourceName(component.name || `lambda-${component.id.slice(-4)}`)}" {
  function_name = "${component.name || `lambda-${component.id.slice(-4)}`}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "${component.handler || 'index.handler'}"
  runtime       = "${component.runtime || 'nodejs14.x'}"
  memory_size   = ${component.memory || 128}
  timeout       = ${component.timeout || 3}
  
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
    },

    // Storage Services
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
        color: '#3F8624', // AWS green
        defaultProperties: {
            size: 20, // GB
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
                    { value: 'gp2', label: 'General Purpose SSD (gp2)' },
                    { value: 'gp3', label: 'General Purpose SSD (gp3)' },
                    { value: 'io1', label: 'Provisioned IOPS SSD (io1)' },
                    { value: 'st1', label: 'Throughput Optimized HDD (st1)' },
                    { value: 'sc1', label: 'Cold HDD (sc1)' }
                ]
            },
            { type: 'number', key: 'iops', label: 'IOPS', min: 100, max: 64000 }
        ],
        allowedConnections: ['ec2'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_ebs_volume" "${sanitizeResourceName(component.name || `ebs-${component.id.slice(-4)}`)}" {
  availability_zone = "us-west-2a"
  size              = ${component.size || 20}
  type              = "${component.volume_type || 'gp2'}"
  ${component.volume_type === 'io1' ? `iops             = ${component.iops || 100}` : ''}
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // Simplified EBS pricing
            const volumeTypePricing = {
                'gp2': 0.10, // $0.10 per GB-month
                'gp3': 0.08, // $0.08 per GB-month
                'io1': 0.125, // $0.125 per GB-month + $0.065 per provisioned IOPS
                'st1': 0.045, // $0.045 per GB-month
                'sc1': 0.025, // $0.025 per GB-month
            };

            const basePrice = (props.size || 20) * (volumeTypePricing[props.volume_type] || 0.10);
            const iopsPrice = props.volume_type === 'io1' ? (props.iops || 100) * 0.065 : 0;

            return basePrice + iopsPrice;
        }
    },

    // Database Services
    rds: {
        type: 'rds',
        category: 'database',
        displayName: 'RDS Database',
        icon: '/icons/rds.svg',
        color: '#3B48CC', // AWS blue
        defaultProperties: {
            engine: 'mysql',
            instance_class: 'db.t2.micro',
            allocated_storage: 20,
            multi_az: false
        },
        propertyEditors: [
            {
                type: 'select',
                key: 'engine',
                label: 'Database Engine',
                options: [
                    { value: 'mysql', label: 'MySQL' },
                    { value: 'postgres', label: 'PostgreSQL' },
                    { value: 'mariadb', label: 'MariaDB' },
                    { value: 'oracle-se2', label: 'Oracle SE2' },
                    { value: 'sqlserver-ex', label: 'SQL Server Express' }
                ]
            },
            {
                type: 'select',
                key: 'instance_class',
                label: 'Instance Class',
                options: [
                    { value: 'db.t2.micro', label: 'db.t2.micro' },
                    { value: 'db.t2.small', label: 'db.t2.small' },
                    { value: 'db.t2.medium', label: 'db.t2.medium' },
                    { value: 'db.m5.large', label: 'db.m5.large' }
                ]
            },
            { type: 'number', key: 'allocated_storage', label: 'Storage (GB)', min: 20, max: 64000 },
            { type: 'checkbox', key: 'multi_az', label: 'Multi-AZ Deployment' }
        ],
        allowedConnections: ['ec2', 'lambda'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_db_instance" "${sanitizeResourceName(component.name || `rds-${component.id.slice(-4)}`)}" {
  allocated_storage    = ${component.allocated_storage || 20}
  engine               = "${component.engine || 'mysql'}"
  engine_version       = "${getEngineVersion(component.engine)}"
  instance_class       = "${component.instance_class || 'db.t2.micro'}"
  name                 = "${sanitizeResourceName(component.name || `rds${component.id.slice(-4)}`)}"
  username             = "admin"
  password             = "password" # In production, use aws_secretsmanager_secret
  skip_final_snapshot  = true
  multi_az             = ${component.multi_az || false}
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // Simplified RDS pricing
            const instancePricing = {
                'db.t2.micro': 12.41, // $12.41 per month
                'db.t2.small': 24.82, // $24.82 per month
                'db.t2.medium': 49.64, // $49.64 per month
                'db.m5.large': 138.7, // $138.7 per month
            };

            const storageCost = (props.allocated_storage || 20) * 0.115; // $0.115 per GB-month
            const instanceCost = instancePricing[props.instance_class] || 12.41;
            const multiAZMultiplier = props.multi_az ? 2 : 1;

            return (instanceCost * multiAZMultiplier) + storageCost;
        }
    },

    dynamodb: {
        type: 'dynamodb',
        category: 'database',
        displayName: 'DynamoDB Table',
        icon: '/icons/dynamodb.svg',
        color: '#3B48CC', // AWS blue
        defaultProperties: {
            billing_mode: 'PROVISIONED',
            read_capacity: 5,
            write_capacity: 5
        },
        propertyEditors: [
            {
                type: 'select',
                key: 'billing_mode',
                label: 'Billing Mode',
                options: [
                    { value: 'PROVISIONED', label: 'Provisioned Capacity' },
                    { value: 'PAY_PER_REQUEST', label: 'On-Demand (Pay per request)' }
                ]
            },
            { type: 'number', key: 'read_capacity', label: 'Read Capacity Units', min: 1, max: 40000 },
            { type: 'number', key: 'write_capacity', label: 'Write Capacity Units', min: 1, max: 40000 }
        ],
        allowedConnections: ['ec2', 'lambda'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_dynamodb_table" "${sanitizeResourceName(component.name || `dynamodb-${component.id.slice(-4)}`)}" {
  name           = "${component.name || `dynamodb-${component.id.slice(-4)}`}"
  billing_mode   = "${component.billing_mode || 'PROVISIONED'}"
  ${component.billing_mode !== 'PAY_PER_REQUEST' ? `
  read_capacity  = ${component.read_capacity || 5}
  write_capacity = ${component.write_capacity || 5}` : ''}
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            if (props.billing_mode === 'PAY_PER_REQUEST') {
                // Assume 1M reads and 0.5M writes per month for estimation
                const readCost = 0.25 * 1; // $0.25 per 1M read request units
                const writeCost = 1.25 * 0.5; // $1.25 per 1M write request units
                return readCost + writeCost;
            } else {
                // Provisioned capacity pricing
                const readCost = (props.read_capacity || 5) * 0.00013 * 730; // $0.00013 per RCU-hour
                const writeCost = (props.write_capacity || 5) * 0.00065 * 730; // $0.00065 per WCU-hour
                return readCost + writeCost;
            }
        }
    },

    // Networking Services
    vpc: {
        type: 'vpc',
        category: 'networking',
        displayName: 'VPC',
        icon: '/icons/vpc.svg',
        color: '#248814', // AWS green
        defaultProperties: {
            cidr_block: '10.0.0.0/16'
        },
        propertyEditors: [
            { type: 'text', key: 'cidr_block', label: 'CIDR Block' }
        ],
        allowedConnections: ['subnet', 'internetGateway'],
        size: { width: 80, height: 80 },
        terraformTemplate: (component) => `
resource "aws_vpc" "${sanitizeResourceName(component.name || `vpc-${component.id.slice(-4)}`)}" {
  cidr_block           = "${component.cidr_block || '10.0.0.0/16'}"
  enable_dns_support   = true
  enable_dns_hostnames = true
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // VPC is free, but we'll return a small value for NAT Gateway that's typically used
            return 0; // Free
        }
    },

    subnet: {
        type: 'subnet',
        category: 'networking',
        displayName: 'Subnet',
        icon: '/icons/subnet.svg',
        color: '#248814', // AWS green
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
        allowedConnections: ['ec2', 'rds', 'elasticache'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_subnet" "${sanitizeResourceName(component.name || `subnet-${component.id.slice(-4)}`)}" {
  vpc_id                  = "\${aws_vpc.main.id}" // This would need to be dynamically determined based on connections
  cidr_block              = "${component.cidr_block || '10.0.1.0/24'}"
  availability_zone       = "${component.availability_zone || 'us-west-2a'}"
  map_public_ip_on_launch = ${component.public || true}
  
  tags = {
    Name = "${component.name || component.id}"
  }
}`.trim(),
        costCalculation: (props) => {
            // Subnets are free
            return 0; // Free
        }
    },

    securityGroup: {
        type: 'securityGroup',
        category: 'networking',
        displayName: 'Security Group',
        icon: '/icons/security-group.svg',
        color: '#248814', // AWS green
        defaultProperties: {
            name: '',
            description: 'Security group created via Cloud Design Tool'
        },
        propertyEditors: [
            { type: 'text', key: 'name', label: 'Name' },
            { type: 'text', key: 'description', label: 'Description' }
        ],
        allowedConnections: ['ec2', 'rds', 'elasticache'],
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_security_group" "${sanitizeResourceName(component.name || `sg-${component.id.slice(-4)}`)}" {
  name        = "${component.name || `sg-${component.id.slice(-4)}`}"
  description = "${component.description || 'Security group created via Cloud Design Tool'}"
  vpc_id      = "\${aws_vpc.main.id}" // This would need to be dynamically determined based on connections
  
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
        costCalculation: (props) => {
            // Security Groups are free
            return 0; // Free
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
        size: { width: 60, height: 60 },
        terraformTemplate: (component) => `
resource "aws_lb" "${sanitizeResourceName(component.name || `lb-${component.id.slice(-4)}`)}" {
  name               = "${component.name || `lb-${component.id.slice(-4)}`}"
  internal           = ${component.internal || false}
  load_balancer_type = "${component.lb_type || 'application'}"
  security_groups    = ["\${aws_security_group.lb_sg.id}"] // This would need to be dynamically determined
  subnets            = ["\${aws_subnet.public_a.id}", "\${aws_subnet.public_b.id}"] // This would need to be dynamically determined
  
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

// Helper function for RDS engine versions
const getEngineVersion = (engine) => {
    switch (engine) {
        case 'mysql':
            return '8.0';
        case 'postgres':
            return '13.4';
        case 'mariadb':
            return '10.5';
        case 'oracle-se2':
            return '19.0';
        case 'sqlserver-ex':
            return '15.00';
        default:
            return '8.0';
    }
};