import React from 'react';
import { RegisterForm } from '../auth/components/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-universe-background text-universe-text flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-universe-primary mb-2">Create Account</h1>
          <p className="text-universe-text-secondary">Join VerseForge</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
};
