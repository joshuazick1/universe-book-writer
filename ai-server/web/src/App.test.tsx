import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
    it('renders server status section', () => {
        render(<App />);
        expect(screen.getByText(/Server Status/i)).toBeInTheDocument();
    });

    it('renders models section', () => {
        render(<App />);
        expect(screen.getByText(/Models/i)).toBeInTheDocument();
    });

    it('renders prompt section', () => {
        render(<App />);
        expect(screen.getByText(/Prompt/i)).toBeInTheDocument();
    });

    it('renders configuration section', () => {
        render(<App />);
        expect(screen.getByText(/Configuration/i)).toBeInTheDocument();
    });

    it('disables Send Prompt button when prompt is empty', () => {
        render(<App />);
        expect(screen.getByText(/Send Prompt/i)).toBeDisabled();
    });
});
