import React from 'react';

/**
 * BenchmarkConfigPanel Component
 * Admin interface for cost thresholds and frequency settings.
 */
const BenchmarkConfigPanel: React.FC = () => {
    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h1 className="text-xl font-bold mb-4">Benchmark Configuration Panel</h1>
            <form>
                <div className="mb-4">
                    <label htmlFor="costThreshold" className="block text-gray-700 font-medium mb-2">
                        Cost Threshold
                    </label>
                    <input
                        type="number"
                        id="costThreshold"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Enter cost threshold"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="frequency" className="block text-gray-700 font-medium mb-2">
                        Frequency (in hours)
                    </label>
                    <input
                        type="number"
                        id="frequency"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Enter frequency"
                    />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                    Save Configuration
                </button>
            </form>
        </div>
    );
};

export default BenchmarkConfigPanel;
