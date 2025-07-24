import { useState, useEffect } from 'react';
import { listTools } from '../utils/apiClient';

/**
 * Custom hook to fetch and manage the tool registry.
 * @returns An object containing the list of tools and loading/error states.
 */
const useToolRegistry = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      setError('');
      try {
        const toolsList = await listTools();
        setTools(toolsList);
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError('Failed to fetch tools.');
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  return { tools, loading, error };
};

export default useToolRegistry;
