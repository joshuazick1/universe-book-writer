import { useState, useCallback } from 'react';
import { ragService } from '../../../services/ragService';

/**
 * useFileStorage - Custom hook for file upload, versioning, and diff preview logic.
 *
 * @returns {object} File storage state and handlers
 *
 * Example usage:
 * const { file, setFile, uploadFile, versions, diffPreview, loading, error } = useFileStorage();
 */
export interface FileVersion {
    id: string;
    name: string;
    createdAt: string;
    size: number;
}

export function useFileStorage() {
    const [file, setFile] = useState<File | null>(null);
    const [versions, setVersions] = useState<FileVersion[]>([]);
    const [diffPreview, setDiffPreview] = useState<string | object>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Upload file and trigger backend versioning
    const uploadFile = useCallback(async (
        universeId: string,
        bookTitle: string,
        chapterTitle?: string
    ) => {
        if (!file) {
            setError('No file selected');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('universeId', universeId);
            formData.append('bookTitle', bookTitle);
            if (chapterTitle) formData.append('chapterTitle', chapterTitle);
            // POST to backend file upload endpoint
            const res = await ragService.uploadCanonicalFile(formData);
            setVersions(res.versions || []);
            setFile(null); // Clear file after upload
        } catch (e: any) {
            setError(e.message || 'File upload failed');
        } finally {
            setLoading(false);
        }
    }, [file]);

    // Fetch diff preview for a given version
    const fetchDiffPreview = useCallback(async (versionId: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await ragService.getFileDiffPreview(versionId);
            setDiffPreview(res);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch diff preview');
        } finally {
            setLoading(false);
        }
    }, []);

    // Diff between two versions (stub, backend must support)
    const fetchDiffBetweenVersions = useCallback(async (versionA: string, versionB: string) => {
        setLoading(true);
        setError(null);
        try {
            // TODO: Replace with real API call when backend supports
            // const res = await ragService.getFileDiffBetweenVersions(versionA, versionB);
            // setDiffPreview(res);
            setDiffPreview(`Diff between ${versionA} and ${versionB} (not yet implemented)`);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch diff between versions');
        } finally {
            setLoading(false);
        }
    }, []);

    // Rollback to a previous version (stub)
    const rollbackToVersion = useCallback(async (versionId: string) => {
        setLoading(true);
        setError(null);
        try {
            // TODO: Replace with real API call when backend supports
            // await ragService.rollbackFileToVersion(versionId);
            setDiffPreview(`Rolled back to version ${versionId} (not yet implemented)`);
        } catch (e: any) {
            setError(e.message || 'Failed to rollback');
        } finally {
            setLoading(false);
        }
    }, []);

    // Migrate content from a version (stub)
    const migrateVersion = useCallback(async (versionId: string) => {
        setLoading(true);
        setError(null);
        try {
            // TODO: Replace with real API call when backend supports
            // await ragService.migrateFileVersion(versionId);
            setDiffPreview(`Migrated content from version ${versionId} (not yet implemented)`);
        } catch (e: any) {
            setError(e.message || 'Failed to migrate');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        file,
        setFile,
        uploadFile,
        versions,
        diffPreview,
        fetchDiffPreview,
        fetchDiffBetweenVersions,
        rollbackToVersion,
        migrateVersion,
        loading,
        error,
    };
}
