
import React from 'react';
import RAGDashboard from '../features/rag-dashboard/RAGDashboard';
import { RAGFilterProvider } from '../features/rag-dashboard/RAGFilterBar';

const RAGTab: React.FC = () => {
    return (
        <RAGFilterProvider>
            <RAGDashboard />
        </RAGFilterProvider>
    );
};

export default RAGTab;
