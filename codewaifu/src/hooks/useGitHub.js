import { useEffect } from 'react';
import { useStore } from '../store/useStore';
/**
 * Auto-refresh stats if they're missing but we have a username persisted.
 */
export function useAutoLoad() {
    const username = useStore((s) => s.username);
    const stats = useStore((s) => s.stats);
    const loading = useStore((s) => s.loading);
    const refresh = useStore((s) => s.refresh);
    useEffect(() => {
        if (username && !stats && !loading) {
            refresh().catch(() => {
                /* swallowed; error stored */
            });
        }
    }, [username, stats, loading, refresh]);
}
