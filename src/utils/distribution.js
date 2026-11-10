const fs = require('node:fs');
const path = require('node:path');
function isStoreDistribution(app, runtime = process) {
    if (runtime.windowsStore === true) return true;
    if (!app.isPackaged) return false;
    try {
        return JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'distribution.json'), 'utf8')).channel === 'microsoft-store';
    } catch {
        return false;
    }
}
class StoreUpdateService {
    constructor({ app, notify = () => {}, openExternal }) {
        this.notify = notify;
        this.openExternal = openExternal;
        this.state = {
            channel: 'microsoft-store',
            currentVersion: app.getVersion(),
            latestVersion: '',
            phase: 'managed',
            required: false,
            available: false,
            error: '',
            notice: '',
        };
        this.openPromise = null;
    }
    getState() {
        return { ...this.state };
    }
    async check() {
        this.notify(this.getState());
        return this.getState();
    }
    async assertSessionAllowed() {
        /* Store versions are managed by Microsoft Store, not the EXE release policy. */
    }
    async openInstaller() {
        if (this.openPromise) return this.openPromise;
        this.openPromise = this.openStore().finally(() => {
            this.openPromise = null;
        });
        return this.openPromise;
    }
    async openStore() {
        try {
            await this.openExternal('ms-windows-store://downloadsandupdates');
            this.state = { ...this.state, error: '', notice: 'Microsoft Store opened. Check Downloads for Hintio updates.' };
        } catch {
            this.state = {
                ...this.state,
                notice: '',
                error: 'Microsoft Store could not be opened. Open Microsoft Store from Start and check Downloads.',
            };
        }
        this.notify(this.getState());
        return this.getState();
    }
}
module.exports = { isStoreDistribution, StoreUpdateService };
