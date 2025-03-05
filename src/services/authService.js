// src/services/authService.js
import httpClient from './httpClient';

// Handle common response processing
const processResponse = (response) => {
    return response.data;
};

const verificationRequests = {};

// Handle errors consistently
const handleError = (error) => {
    console.log("Handling error:", error);

    // If the error has a response from the server
    if (error.response) {
        console.log("Server responded with error:", error.response.status, error.response.data);
        return error.response.data || {
            success: false,
            message: `Server error: ${error.response.status}`
        };
    }

    // Network errors or other issues
    console.log("Network or other error:", error.message);
    return {
        success: false,
        message: error.message || 'Network error, please check your connection'
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
        // Prevent duplicate requests
        if (verificationRequests[token]) {
            console.log("Returning cached verification request for token:", token);
            return verificationRequests[token];
        }

        // Create a promise for this request
        const requestPromise = new Promise(async (resolve) => {
            try {
                console.log("authService: Calling verify endpoint with token:", token);
                const response = await httpClient.get(`/auth/verify?token=${token}`);
                console.log("authService: Verification response:", response.data);
                resolve(processResponse(response));
            } catch (error) {
                console.error('Email verification error details:', error.response || error);
                resolve(handleError(error));
            }
        });

        // Store this promise for deduplication
        verificationRequests[token] = requestPromise;

        // Clear from cache after 5 seconds
        setTimeout(() => {
            delete verificationRequests[token];
        }, 5000);

        return requestPromise;
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