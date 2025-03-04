// src/services/index.js
import * as awsServices from './aws';
import * as terraformServices from './terraform';
import * as storageService from './utils/storageService';
import * as costCalculationService from './utils/costCalculationService';
import * as resourceUtils from './utils/resourceNameUtils';

// Export all services
export {
    awsServices,
    terraformServices,
    storageService,
    costCalculationService,
    resourceUtils
};