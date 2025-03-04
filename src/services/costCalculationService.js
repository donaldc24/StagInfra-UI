// src/services/costCalculationService.js
import { updateCost, setCostLoading, setCostError } from '../store/slices/costSlice';

/**
 * Calls the backend API to calculate infrastructure costs
 *
 * @param {Array} components - The component list to calculate costs for
 * @param {Function} dispatch - Redux dispatch function
 */
export const calculateCost = async (components, dispatch) => {
    try {
        dispatch(setCostLoading(true));

        // Convert components to the format expected by the backend
        const componentsList = components.map(component => {
            // Extract only the properties needed for cost calculation
            const { id, type, ...properties } = component;
            return { type, ...properties };
        });

        // Create the request payload
        const costRequest = {
            components: componentsList.map(comp => {
                // For each component, create an object with type and other properties
                return {
                    type: comp.type,
                    ...getComponentSpecificProps(comp)
                };
            })
        };

        // Call the backend API
        const response = await fetch('http://localhost:8080/api/cost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(costRequest),
        });

        if (!response.ok) {
            throw new Error(`Error from cost API: ${response.status}`);
        }

        // Get cost calculation
        const result = await fetch('http://localhost:8080/api/cost');
        const costData = await result.json();

        // Update the cost in Redux store
        dispatch(updateCost(costData.total));
        dispatch(setCostLoading(false));

        return costData.total;
    } catch (error) {
        console.error('Error calculating cost:', error);
        dispatch(setCostError(error.message || 'Failed to calculate cost'));
        dispatch(setCostLoading(false));
        return 0; // Return 0 as fallback
    }
};

/**
 * Gets component-specific properties needed for cost calculation
 */
const getComponentSpecificProps = (component) => {
    const { type } = component;

    switch (type) {
        case 'ec2':
            return {
                instances: component.instances || 1,
                instance_type: component.instance_type || 't2.micro'
            };
        case 's3':
            return {
                storage: component.storage || 10
            };
        case 'rds':
            return {
                instance_class: component.instance_class || 'db.t2.micro',
                allocated_storage: component.allocated_storage || 20,
                multi_az: component.multi_az || false
            };
        case 'dynamodb':
            return {
                billing_mode: component.billing_mode || 'PROVISIONED',
                read_capacity: component.read_capacity || 5,
                write_capacity: component.write_capacity || 5
            };
        case 'lambda':
            return {
                memory: component.memory || 128
            };
        case 'ebs':
            return {
                size: component.size || 20,
                volume_type: component.volume_type || 'gp2',
                iops: component.iops || 100
            };
        case 'loadBalancer':
            return {
                lb_type: component.lb_type || 'application'
            };
        default:
            return {};
    }
};

/**
 * Performs local cost estimation as a fallback
 * This is used when the backend is unavailable
 */
export const estimateCostLocally = (components) => {
    let total = 0;

    components.forEach(component => {
        switch (component.type) {
            case 'ec2':
                const instanceTypeCosts = {
                    't2.nano': 5.0,
                    't2.micro': 8.5,
                    't2.small': 17.0,
                    't2.medium': 34.0,
                    't2.large': 68.0
                };
                total += (instanceTypeCosts[component.instance_type] || 8.5) * (component.instances || 1);
                break;
            case 's3':
                total += 0.023 * (component.storage || 10);
                break;
            case 'rds':
                const instancePricing = {
                    'db.t2.micro': 12.41,
                    'db.t2.small': 24.82,
                    'db.t2.medium': 49.64,
                    'db.m5.large': 138.7
                };
                const storageCost = (component.allocated_storage || 20) * 0.115;
                const instanceCost = instancePricing[component.instance_class] || 12.41;
                const multiAZMultiplier = component.multi_az ? 2 : 1;
                total += (instanceCost * multiAZMultiplier) + storageCost;
                break;
            // Add more component types as needed
            default:
                break;
        }
    });

    return parseFloat(total.toFixed(2));
};