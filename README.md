# Cloud Architecture Designer UI

This is the frontend user interface for the Cloud Architecture Designer application, a visual tool for designing and estimating costs of AWS cloud architectures.

## Overview

The Cloud Architecture Designer UI provides a drag-and-drop interface for creating AWS architecture diagrams, with features including:

- Visual component design with AWS service components
- Real-time cost estimation
- Terraform code generation
- User authentication
- Architecture saving and loading

## Technology Stack

- React.js
- Redux for state management
- React Router for navigation
- Konva.js for canvas rendering
- Axios for API communication
- Lodash for utility functions
- PapaParse for CSV processing

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/cloud-architecture-designer-ui.git
cd cloud-architecture-designer-ui
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Configure the environment
   - Create a `.env` file based on `.env.example`
   - Set the API base URL and other configurations

4. Start the development server
```bash
npm start
# or
yarn start
```

The application will be available at `http://localhost:3000`

## Key Features

### AWS Component Library

The application includes a comprehensive library of AWS components, including:

- Compute (EC2, Lambda)
- Storage (S3, EBS)
- Database (RDS, DynamoDB)
- Networking (VPC, Subnet, Security Group)
- Load Balancing

### Canvas Interaction

- Drag-and-drop component placement
- Component connection creation
- Zooming and panning
- Multi-select and group operations
- Component property editing

### Cost Calculation

- Real-time cost estimation
- AWS price integration
- Cost breakdown by component
- Support for different regions and pricing models

### Terraform Generation

- Automatic Terraform code generation
- Best practices implementation
- Resource dependency management
- Component relationship mapping

## Project Structure

- `src/` - Source code
  - `components/` - React components
    - `auth/` - Authentication components
    - `canvas/` - Canvas and diagram components
    - `properties/` - Property editors
    - `shared/` - Reusable UI components
    - `sidebar/` - Sidebar components
  - `hooks/` - Custom React hooks
  - `services/` - API and utility services
    - `aws/` - AWS service definitions
    - `terraform/` - Terraform generation code
    - `utils/` - Utility functions
  - `store/` - Redux state management
    - `slices/` - Redux slices
    - `middleware/` - Redux middleware
  - `styles/` - CSS stylesheets

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build production version
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Component Development

When adding new components or features:

1. Create new components in the appropriate directory
2. Update the Redux store if needed
3. Add styles to the relevant CSS files
4. Update AWS component definitions if adding new AWS services

## Deployment

Build the production version:

```bash
npm run build
# or
yarn build
```

The build artifacts will be stored in the `build/` directory, ready to be deployed to a static hosting service.

## License

[Your License Here]