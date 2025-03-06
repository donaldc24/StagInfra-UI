// src/services/aws/awsIconLibrary.js
import React from 'react';

// SVG path data for simplified AWS icons
const iconPaths = {
    ec2: 'M18.35,6.87v10.28h-12.7V6.87H18.35L18.35,6.87z M18.35,4.87H5.65c-1.1,0-2,0.9-2,2v10.28c0,1.1,0.9,2,2,2h12.7c1.1,0,2-0.9,2-2V6.87C20.35,5.77,19.45,4.87,18.35,4.87L18.35,4.87z M16.35,10.51c0,0.83-0.67,1.5-1.5,1.5s-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5S16.35,9.68,16.35,10.51L16.35,10.51z',
    s3: 'M18.35,7.82v10.17c0,0.55-0.45,1-1,1h-10.7c-0.55,0-1-0.45-1-1V7.82l6.35-2.98L18.35,7.82z M19.35,6.87L12,3.35L4.65,6.87C4.26,7.05,4,7.45,4,7.88v10.11c0,1.13,0.92,2.05,2.05,2.05h11.89c1.13,0,2.05-0.92,2.05-2.05V7.88C20,7.45,19.74,7.05,19.35,6.87z',
    lambda: 'M19.29,15.12l-6.79-11c-0.29-0.47-0.79-0.75-1.34-0.75H8.84c-0.55,0-1.06,0.29-1.34,0.75l-6.79,11c-0.29,0.47-0.29,1.04,0,1.51s0.79,0.75,1.34,0.75h15.9c0.55,0,1.06-0.29,1.34-0.75S19.58,15.59,19.29,15.12z M11.15,5.37l6.79,11H8.81l-3.17-5.13L11.15,5.37z',
    dynamodb: 'M18.25,12c0,1.1-2.79,2-6.25,2s-6.25-0.9-6.25-2s2.79-2,6.25-2S18.25,10.9,18.25,12z M5.75,14.59c0,1.1,2.79,2,6.25,2s6.25-0.9,6.25-2v-2.18c0,1.1-2.79,2-6.25,2s-6.25-0.9-6.25-2V14.59z M18.25,9.41v-2.18c0,1.1-2.79,2-6.25,2s-6.25-0.9-6.25-2v2.18c0,1.1,2.79,2,6.25,2S18.25,10.51,18.25,9.41z M12,5.23c3.46,0,6.25,0.9,6.25,2s-2.79,2-6.25,2s-6.25-0.9-6.25-2S8.54,5.23,12,5.23z',
    rds: 'M17.77,8.62c-0.12-0.71-0.36-1.39-0.71-2H7c-1.1,0-2,0.9-2,2v6c0,1.1,0.9,2,2,2h10c1.1,0,2-0.9,2-2v-5.11C18.53,9.28,18.1,8.98,17.77,8.62z M16,14.12c0,0.55-0.45,1-1,1H9c-0.55,0-1-0.45-1-1v-4c0-0.55,0.45-1,1-1h6c0.55,0,1,0.45,1,1V14.12z M19.5,7.25c0,1.24-1.01,2.25-2.25,2.25S15,8.49,15,7.25s1.01-2.25,2.25-2.25S19.5,6.01,19.5,7.25z',
    vpc: 'M19,5H5C3.9,5,3,5.9,3,7v10c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V7C21,5.9,20.1,5,19,5z M19,17H5V7h14V17z',
    subnet: 'M20,15.5v-6.97C18.39,8.17,16.27,8,14,8c-2.27,0-4.39,0.17-6,0.52v6.97c0,0.28,0.22,0.5,0.5,0.5h11C19.77,16,20,15.77,20,15.5z M10,6c1.1,0,2-0.9,2-2s-0.9-2-2-2S8,2.9,8,4S8.9,6,10,6z M14,4c0,1.1,0.9,2,2,2s2-0.9,2-2s-0.9-2-2-2S14,2.9,14,4z',
    securityGroup: 'M12.74,4.04l-8,2.5C4.3,6.68,4,7.09,4,7.55v3.9c0,4.27,3.13,8.17,7.43,8.89l0.57,0.11l0.57-0.11c4.3-0.72,7.43-4.62,7.43-8.89v-3.9c0-0.47-0.3-0.87-0.74-1.01l-8-2.5C12.03,3.97,11.71,3.97,12.74,4.04z M15.75,7.4L12,11.15L8.25,7.4L7.19,8.46L12,13.27l4.81-4.81L15.75,7.4z',
    loadBalancer: 'M17,4h-3c0-1.1-0.9-2-2-2s-2,0.9-2,2H7C5.9,4,5,4.9,5,6v12c0,1.1,0.9,2,2,2h10c1.1,0,2-0.9,2-2V6C19,4.9,18.1,4,17,4z M12,4c0.55,0,1,0.45,1,1s-0.45,1-1,1s-1-0.45-1-1S11.45,4,12,4z M12,8c2.76,0,5,2.24,5,5s-2.24,5-5,5s-5-2.24-5-5S9.24,8,12,8z M12,16c1.65,0,3-1.35,3-3s-1.35-3-3-3s-3,1.35-3,3S10.35,16,12,16z',
    ebs: 'M19.35,10c0,4.41-3.59,8-8,8c-1.48,0-2.86-0.41-4.06-1.11l-1.83,1.83c1.68,1.17,3.7,1.8,5.77,1.86c3.47,0.1,6.56-1.26,8.79-3.49c2.29-2.29,3.49-5.33,3.49-8.79c-0.06-2.18-0.78-4.19-1.86-5.77l-1.83,1.83C19.01,7.36,19.35,8.63,19.35,10z M6.05,4.63C4.2,6.48,3.35,9.1,3.7,11.63c0.19,1.35,0.69,2.63,1.43,3.75l1.84-1.84c-0.43-0.59-0.75-1.24-0.91-1.93c-0.23-0.99-0.17-2.07,0.36-3.06c0.66-1.24,1.82-2.07,3.16-2.32c2.07-0.39,4.11,0.75,4.72,2.63c0.46,1.42,0.15,2.96-0.83,4.07l1.92,1.92c2.02-2.02,2.63-4.95,1.56-7.63C13.51,3.09,9.07,1.65,6.05,4.63z',
    internetGateway: 'M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8c0-1.6,0.47-3.08,1.28-4.33l11.05,11.05C15.08,19.53,13.6,20,12,20z M18.72,16.33L7.67,5.28C8.92,4.47,10.4,4,12,4c4.41,0,8,3.59,8,8C20,13.6,19.53,15.08,18.72,16.33z',
    natGateway: 'M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6V13z',
    routeTable: 'M3,13h8v8H3V13z M3,3h8v8H3V3z M13,3h8v8h-8V3z M13,13h8v8h-8V13z',
    networkACL: 'M18,8h-1V6c0-2.76-2.24-5-5-5S7,3.24,7,6v2H6c-1.1,0-2,0.9-2,2v10c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V10C20,8.9,19.1,8,18,8z M12,17c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S13.1,17,12,17z M9,8V6c0-1.66,1.34-3,3-3s3,1.34,3,3v2H9z',
};

/**
 * A component that renders a simplified AWS service icon as an SVG
 *
 * @param {Object} props - Component props
 * @param {string} props.type - AWS service type (e.g., 'ec2', 's3')
 * @param {string} props.color - Fill color for the icon
 * @param {number} props.size - Size of the icon
 * @param {Object} props.style - Additional style properties
 */
export const AwsIcon = ({ type, color = '#232F3E', size = 24, style = {} }) => {
    // Default to a placeholder if icon not found
    const path = iconPaths[type] || 'M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm0,18a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z';

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={style}
        >
            <path d={path} fill={color} />
        </svg>
    );
};

/**
 * Get the display name for an AWS service
 *
 * @param {string} type - AWS service type (e.g., 'ec2', 's3')
 * @returns {string} - Human-readable display name
 */
export const getAwsServiceName = (type) => {
    const serviceNames = {
        ec2: 'EC2 Instance',
        s3: 'S3 Bucket',
        lambda: 'Lambda Function',
        dynamodb: 'DynamoDB Table',
        rds: 'RDS Database',
        vpc: 'Virtual Private Cloud',
        subnet: 'Subnet',
        securityGroup: 'Security Group',
        loadBalancer: 'Load Balancer',
        ebs: 'EBS Volume',
        internetGateway: 'Internet Gateway',
        natGateway: 'NAT Gateway',
        routeTable: 'Route Table',
        networkACL: 'Network ACL',
    };

    return serviceNames[type] || type;
};

/**
 * Get the standard AWS color for a service type
 *
 * @param {string} type - AWS service type
 * @returns {string} - Hex color code
 */
export const getAwsServiceColor = (type) => {
    const categoryColors = {
        // Compute
        ec2: '#FF9900',           // Orange
        lambda: '#FF9900',

        // Storage
        s3: '#3F8624',            // Green
        ebs: '#3F8624',

        // Database
        dynamodb: '#3B48CC',      // Blue
        rds: '#3B48CC',

        // Networking
        vpc: '#248814',           // Dark Green
        subnet: '#34A853',        // Light Green
        securityGroup: '#4285F4', // Blue
        loadBalancer: '#248814',
        internetGateway: '#4285F4',
        natGateway: '#4285F4',
        routeTable: '#4285F4',
        networkACL: '#4285F4',
    };

    return categoryColors[type] || '#6B7280'; // Default gray
};

export default {
    AwsIcon,
    getAwsServiceName,
    getAwsServiceColor,
};