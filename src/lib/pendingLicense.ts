export interface PendingLicense {
    plan: 'monthly' | 'yearly';
    reference: string;
}

const storageKey = 'hintio_pending_license';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// Store only a recovery hint, never a license key, signature, or login credential.
export function readPendingLicense(persistent: StorageAccess, legacy?: StorageAccess): PendingLicense | null {
    for (const storage of [persistent, legacy]) {
        if (!storage) continue;
        try {
            const saved: unknown = JSON.parse(storage.getItem(storageKey) || 'null');
            if (
                saved &&
                typeof saved === 'object' &&
                'plan' in saved &&
                'reference' in saved &&
                (saved.plan === 'monthly' || saved.plan === 'yearly') &&
                typeof saved.reference === 'string'
            ) {
                return { plan: saved.plan, reference: saved.reference };
            }
        } catch {
            /* Try the legacy tab hint if browser storage is unavailable or malformed. */
        }
    }
    return null;
}

export function rememberPendingLicense(pending: PendingLicense, persistent: StorageAccess, legacy?: StorageAccess): void {
    for (const storage of [persistent, legacy]) {
        try {
            storage?.setItem(storageKey, JSON.stringify({ plan: pending.plan, reference: pending.reference }));
        } catch {
            /* A blocked storage area must not interrupt key delivery. */
        }
    }
}

export function forgetPendingLicense(persistent: StorageAccess, legacy?: StorageAccess): void {
    for (const storage of [persistent, legacy]) {
        try {
            storage?.removeItem(storageKey);
        } catch {
            /* The delivered key remains visible. */
        }
    }
}
