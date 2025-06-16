import React from 'react';
import { ForgotPasswordForm } from '../auth/components/ForgotPasswordForm';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-universe-background text-universe-text flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-universe-primary mb-2">Reset Password</h1>
          <p className="text-universe-text-secondary">Enter your email to reset your password</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
};
