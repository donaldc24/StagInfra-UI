// src/services/authService.js
import httpClient from './httpClient';

// Handle common response processing
const processResponse = (response) => {
    return response.data;
};

// Handle errors consistently
const handleError = (error) => {
    // If the error has a response from the server
    if (error.response) {
        return error.response.data;
    }

    // Network errors or other issues
    return {
        success: false,
        message: 'Network error, please check your connection'
    };
};

// Auth service methods
export const authService = {
    // Register a new user
    register: async (userData) => {
        try {
            const response = await httpClient.post('/auth/register', userData);
            return processResponse(response);
        } catch (error) {
            return handleError(error);
        }
    },

    // Verify email with token
    verifyEmail: async (token) => {
        try {
            const response = await httpClient.get(`/auth/verify?token=${token}`);
            return processResponse(response);
        } catch (error) {
            return handleError(error);
        }
    },

    // Resend verification email
    resendVerification: async (email) => {
        try {
            const response = await httpClient.post(`/auth/resend-verification?email=${email}`);
            return processResponse(response);
        } catch (error) {
            return handleError(error);
        }
    },

    // Login user
    login: async (credentials) => {
        try {
            const response = await httpClient.post('/auth/login', credentials);

            // Store JWT token in localStorage
            const data = processResponse(response);
            if (data.success && data.token) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            return handleError(error);
        }
    },

    // Logout user
    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        return { success: true };
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('auth_token');
    },

    // Get current user info
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (error) {
            return null;
        }
    },

    // Get auth token
    getToken: () => {
        return localStorage.getItem('auth_token');
    }
};

// We're using httpClient with interceptors now, no need for separate interceptors here

export default authService;