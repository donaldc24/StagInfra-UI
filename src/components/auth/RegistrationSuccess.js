// src/components/auth/RegistrationSuccess.js
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import '../../styles/auth.css';

const RegistrationSuccess = () => {
    const location = useLocation();
    const email = location.state?.email || 'your email';

    const [resendStatus, setResendStatus] = useState({
        isLoading: false,
        success: false,
        error: null
    });

    // Handle resend verification email
    const handleResendEmail = async () => {
        setResendStatus({
            isLoading: true,
            success: false,
            error: null
        });

        try {
            const response = await authService.resendVerification(email);

            if (response.success) {
                setResendStatus({
                    isLoading: false,
                    success: true,
                    error: null
                });
            } else {
                setResendStatus({
                    isLoading: false,
                    success: false,
                    error: response.message || 'Failed to resend verification email'
                });
            }
        } catch (error) {
            setResendStatus({
                isLoading: false,
                success: false,
                error: 'An error occurred while resending the verification email'
            });
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form-container">
                <div className="success-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
                        <circle cx="12" cy="12" r="10" fill="#4CAF50" />
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="white" />
                    </svg>
                </div>

                <h2>Registration Successful!</h2>

                <div className="success-message">
                    <p>Thank you for registering with Cloud Architecture Designer.</p>
                    <p>We've sent a verification email to <strong>{email}</strong>.</p>
                    <p>Please check your inbox and click on the verification link to activate your account.</p>
                </div>

                <div className="verification-actions">
                    {resendStatus.success ? (
                        <div className="resend-success">
                            Verification email has been resent successfully!
                        </div>
                    ) : (
                        <>
                            <p>Didn't receive the email?</p>
                            <button
                                onClick={handleResendEmail}
                                className="resend-button"
                                disabled={resendStatus.isLoading}
                            >
                                {resendStatus.isLoading ? 'Sending...' : 'Resend Verification Email'}
                            </button>

                            {resendStatus.error && (
                                <div className="error-message">
                                    {resendStatus.error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="navigation-links">
                    <Link to="/" className="back-to-home">Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default RegistrationSuccess;