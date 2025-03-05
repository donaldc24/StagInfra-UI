// src/services/httpClient.js
import axios from 'axios';
import { authService } from './authService';

// Create an axios instance with base configuration
const httpClient = axios.create({
    baseURL: 'http://localhost:8081/api',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000 // 15 seconds timeout
});

// Request interceptor for adding auth token
httpClient.interceptors.request.use(
    (config) => {
        // Add authentication token if available
        const token = authService?.getToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
httpClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
            console.log('Unauthorized request, logging out...');
            authService.logout();
            window.location.href = '/login';
        }

        // Handle 403 Forbidden errors
        if (error.response?.status === 403) {
            console.log('Forbidden resource, insufficient permissions');
        }

        // Handle 429 Too Many Requests
        if (error.response?.status === 429) {
            console.log('Rate limit exceeded, please try again later');
        }

        // Handle 5xx Server Errors
        if (error.response?.status >= 500) {
            console.log('Server error, please try again later');
        }

        return Promise.reject(error);
    }
);

export default httpClient;