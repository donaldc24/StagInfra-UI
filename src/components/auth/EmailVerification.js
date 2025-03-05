// src/components/auth/EmailVerification.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import '../../styles/auth.css';

const EmailVerification = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [verificationState, setVerificationState] = useState({
        isLoading: true,
        isSuccess: false,
        error: null
    });

    useEffect(() => {
        const verifyEmail = async () => {
            // Get token from URL query params
            const queryParams = new URLSearchParams(location.search);
            const token = queryParams.get('token');

            if (!token) {
                setVerificationState({
                    isLoading: false,
                    isSuccess: false,
                    error: 'Verification token is missing'
                });
                return;
            }

            try {
                // Use a flag to make sure we only verify once
                let isMounted = true;

                const response = await authService.verifyEmail(token);

                // Only update state if component is still mounted
                if (isMounted) {
                    if (response.success) {
                        setVerificationState({
                            isLoading: false,
                            isSuccess: true,
                            error: null
                        });
                    } else {
                        setVerificationState({
                            isLoading: false,
                            isSuccess: false,
                            error: response.message || 'Email verification failed'
                        });
                    }
                }

                // Cleanup function to prevent state updates if component unmounts
                return () => {
                    isMounted = false;
                };
            } catch (error) {
                setVerificationState({
                    isLoading: false,
                    isSuccess: false,
                    error: error.response?.data?.message || 'An error occurred during verification'
                });
            }
        };

        verifyEmail();
    }, [location.search]);

    // Redirect to login after successful verification
    const handleContinue = () => {
        navigate('/login');
    };

    // Render loading state
    if (verificationState.isLoading) {
        return (
            <div className="auth-container">
                <div className="auth-form-container">
                    <div className="verification-loading">
                        <div className="spinner"></div>
                        <p>Verifying your email...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Render success state
    if (verificationState.isSuccess) {
        return (
            <div className="auth-container">
                <div className="auth-form-container">
                    <div className="success-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
                            <circle cx="12" cy="12" r="10" fill="#4CAF50" />
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white" />
                        </svg>
                    </div>

                    <h2>Email Verified!</h2>

                    <div className="success-message">
                        <p>Your email has been successfully verified.</p>
                        <p>Your account is now active and you can start using Cloud Architecture Designer.</p>
                    </div>

                    <button onClick={handleContinue} className="auth-button">
                        Continue to Login
                    </button>
                </div>
            </div>
        );
    }

    // Render error state
    return (
        <div className="auth-container">
            <div className="auth-form-container">
                <div className="error-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
                        <circle cx="12" cy="12" r="10" fill="#F44336" />
                        <path d="M13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42l4.3 4.29-4.3 4.29a1 1 0 0 0 0 1.42 1 1 0 0 0 1.42 0l4.29-4.3 4.29 4.3a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42z" fill="white" />
                    </svg>
                </div>

                <h2>Verification Failed</h2>

                <div className="error-message verification-error">
                    <p>{verificationState.error}</p>
                    <p>This may be because:</p>
                    <ul>
                        <li>The verification link has expired</li>
                        <li>The verification link has already been used</li>
                        <li>The verification token is invalid</li>
                    </ul>
                </div>

                <div className="verification-actions">
                    <button onClick={() => navigate('/login')} className="auth-button">
                        Go to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailVerification;