import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement password reset functionality
      setMessage(
        'If an account exists with this email, you will receive password reset instructions.'
      );
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-universe-surface p-8 rounded-lg shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-universe-text">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md bg-universe-input text-universe-text px-3 py-2 border border-universe-border focus:border-universe-primary focus:ring focus:ring-universe-primary focus:ring-opacity-50"
            placeholder="Enter your email"
          />
        </div>

        {message && <div className="text-sm text-universe-text-secondary mt-2">{message}</div>}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-universe-primary hover:bg-universe-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-universe-primary disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Reset Password'}
          </button>
        </div>

        <div className="text-sm text-center mt-4">
          <Link to="/auth/login" className="text-universe-primary hover:text-universe-primary-dark">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
};
