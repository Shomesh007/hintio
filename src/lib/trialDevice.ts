const storageKey = 'hintio_trial_device_v1';
const valid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function getTrialDeviceId(storage: Pick<Storage, 'getItem' | 'setItem'>, createId: () => string = () => crypto.randomUUID()): string {
    try {
        const old = storage.getItem(storageKey);
        if (old && valid.test(old)) return old;
        const id = createId();
        if (!valid.test(id)) throw Error();
        storage.setItem(storageKey, id);
        if (storage.getItem(storageKey) !== id) throw Error();
        return id;
    } catch {
        throw new Error('Browser storage is required to start a free trial. Enable it and retry, or contact support.');
    }
}
