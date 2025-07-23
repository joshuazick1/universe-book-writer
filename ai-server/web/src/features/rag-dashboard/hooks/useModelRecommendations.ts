import { useEffect, useState } from 'react';
import { ModelRecommendation } from '../../../types/models';

/**
 * useModelRecommendations
 * Fetches model recommendations for text-to-RAG-node conversion.
 * Returns loading, error, and recommendations array.
 */
export default function useModelRecommendations() {
    const [recommendations, setRecommendations] = useState<ModelRecommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch('/api/models/recommendations')
            .then(async (res) => {
                if (!res.ok) throw new Error('Failed to fetch recommendations');
                const data = await res.json();
                if (!cancelled) setRecommendations(data.recommendations || []);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Unknown error');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return { recommendations, loading, error };
}
