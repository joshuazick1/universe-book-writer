import { useEffect, useState } from "react";

export function useAvailableModels() {
    const [models, setModels] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch("/api/models")
            .then((r) => {
                if (!r.ok) throw new Error("Failed to fetch models");
                return r.json();
            })
            .then((d) => setModels(Array.isArray(d.models) ? d.models : []))
            .catch((e) => setError(e.message || "Unknown error"))
            .finally(() => setLoading(false));
    }, []);

    return { models, loading, error };
}
