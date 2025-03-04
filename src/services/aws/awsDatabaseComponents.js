// src/services/aws/awsDatabaseComponents.js
import { sanitizeResourceName } from '../utils/resourceNameUtils';

/**
 * Helper function for RDS engine versions
 */
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

/**
 * AWS Database service component definitions
 */
export const databaseComponents = {
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
        // RDS instances must be in a subnet
        mustBeContainedBy: ['subnet'],
        size: { width: 40, height: 40 },
        terraformTemplate: (component, parentSubnet, securityGroups) => `
resource "aws_db_subnet_group" "${sanitizeResourceName(component.name || `rds-${component.id.slice(-4)}`)}_subnet_group" {
  name       = "${sanitizeResourceName(component.name || `rds-${component.id.slice(-4)}`)}-subnet-group"
  subnet_ids = [${parentSubnet ? `aws_subnet.${sanitizeResourceName(parentSubnet.name || `subnet-${parentSubnet.id.slice(-4)}`)}.id` : ''}]
}

resource "aws_db_instance" "${sanitizeResourceName(component.name || `rds-${component.id.slice(-4)}`)}" {
  allocated_storage    = ${component.allocated_storage || 20}
  engine               = "${component.engine || 'mysql'}"
  engine_version       = "${getEngineVersion(component.engine)}"
  instance_class       = "${component.instance_class || 'db.t2.micro'}"
  db_name              = "${sanitizeResourceName(component.name || `rds${component.id.slice(-4)}`)}"
  username             = "admin"
  password             = "password" # In production, use aws_secretsmanager_secret
  skip_final_snapshot  = true
  multi_az             = ${component.multi_az || false}
  db_subnet_group_name = aws_db_subnet_group.${sanitizeResourceName(component.name || `rds-${component.id.slice(-4)}`)}_subnet_group.name
  ${securityGroups && securityGroups.length > 0 ? `vpc_security_group_ids = [${securityGroups.map(sg => `aws_security_group.${sanitizeResourceName(sg.name || `sg-${sg.id.slice(-4)}`)}.id`).join(', ')}]` : ''}
  
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
        // DynamoDB is a global service, not tied to VPC/subnet
        size: { width: 40, height: 40 },
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
    }
};

export default databaseComponents;