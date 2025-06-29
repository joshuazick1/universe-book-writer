/**
 * Debug Auth Component
 * Temporary component to debug authentication issues
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/hooks';

export const DebugAuth: React.FC = () => {
    const { user, isAuthenticated, isLoading, checkAuthStatus } = useAuth();
    const [debugInfo, setDebugInfo] = useState<any>({});

    useEffect(() => {
        const testAuth = async () => {
            try {
                console.log('🔍 Testing authentication...');
                // Test profile endpoint via Vite proxy
                const response = await fetch('/api/auth/profile', {
                    method: 'GET',
                    credentials: 'include', // Important for cookies
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();
                console.log('✅ Direct API test result:', data);

                setDebugInfo({
                    directApiStatus: response.status,
                    directApiData: data,
                    currentUser: user,
                    isAuthenticated,
                    isLoading,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('❌ Direct API test failed:', error);
                setDebugInfo({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    currentUser: user,
                    isAuthenticated,
                    isLoading,
                    timestamp: new Date().toISOString()
                });
            }
        };

        testAuth();
    }, [user, isAuthenticated, isLoading]);

    const handleCheckAuth = async () => {
        try {
            console.log('🔄 Manually checking auth status...');
            await checkAuthStatus();
        } catch (error) {
            console.error('❌ Manual auth check failed:', error);
        }
    };

    return (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg max-w-md z-50">
            <h3 className="font-bold mb-2">🐛 Auth Debug</h3>

            <div className="space-y-2 text-sm">
                <div>
                    <strong>Authenticated:</strong> {isAuthenticated ? '✅' : '❌'}
                </div>
                <div>
                    <strong>Loading:</strong> {isLoading ? '⏳' : '✅'}
                </div>
                <div>
                    <strong>User:</strong> {user ? `${user.email} (${user.role})` : 'None'}
                </div>
                <div>
                    <strong>Last Check:</strong> {debugInfo.timestamp || 'Never'}
                </div>

                {debugInfo.directApiStatus && (
                    <div>
                        <strong>API Status:</strong> {debugInfo.directApiStatus}
                    </div>
                )}

                {debugInfo.error && (
                    <div className="text-red-400">
                        <strong>Error:</strong> {debugInfo.error}
                    </div>
                )}
            </div>

            <button
                onClick={handleCheckAuth}
                className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
            >
                🔄 Check Auth
            </button>

            <details className="mt-2">
                <summary className="cursor-pointer text-xs">Raw Debug Info</summary>
                <pre className="text-xs mt-1 overflow-auto max-h-32">
                    {JSON.stringify(debugInfo, null, 2)}
                </pre>
            </details>
        </div>
    );
};
