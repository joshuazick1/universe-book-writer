/**
 * Universes Page Component
 * Main page for managing universes in the application
 */

import React from 'react';
import { UniverseList } from '../components/universe/UniverseList';

export const UniversesPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-universe-primary mb-2">
                        📚 Universe Management
                    </h1>
                    <p className="text-universe-text-secondary">
                        Create and manage your fictional universes for your book series
                    </p>
                </header>

                <UniverseList />
            </div>
        </div>
    );
};
