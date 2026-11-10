const fs = require('node:fs');
const path = require('node:path');
const RELEASES_URL = 'https://api.github.com/repos/Shomesh007/hintio/releases/latest';
const POLICY_URL = 'https://raw.githubusercontent.com/Shomesh007/hintio/desktop/update-policy.json';
const DOWNLOAD_ROOT = 'https://github.com/Shomesh007/hintio/releases/download/';

function versionParts(value) {
    const text = String(value || '').replace(/^v/, '');
    if (!/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(text)) throw new Error('Invalid update version');
    return text.split('.').map(Number);
}
function compareVersions(a, b) {
    const left = versionParts(a),
        right = versionParts(b);
    for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
    return 0;
}
function downloadUrl(version, name) {
    versionParts(version);
    if (name !== 'Hintio-' + version + '.Setup.exe') throw new Error('Untrusted update asset');
    return DOWNLOAD_ROOT + 'v' + version + '/' + encodeURIComponent(name);
}
function releaseInfo(release) {
    if (release.draft || release.prerelease) throw new Error('A stable release is required');
    const version = String(release.tag_name || '').replace(/^v/, '');
    versionParts(version);
    const assets = new Set((release.assets || []).map(asset => asset.name));
    const installer = 'Hintio-' + version + '.Setup.exe';
    if (!assets.has(installer)) throw new Error('The Windows installer is not published yet');
    return {
        latestVersion: version,
        installerUrl: downloadUrl(version, installer),
        releaseNotes: String(release.body || '').slice(0, 8000),
    };
}
class UpdateService {
    constructor({ app, notify = () => {}, fetchImpl = global.fetch, cachePath, minimumVersion = '1.0.4', now = Date.now, openExternal }) {
        versionParts(app.getVersion());
        versionParts(minimumVersion);
        this.app = app;
        this.openExternal = openExternal;
        this.notify = notify;
        this.fetch = fetchImpl;
        this.cachePath = cachePath;
        this.now = now;
        this.minimumBaseline = minimumVersion;
        this.checkPromise = null;
        this.openPromise = null;
        this.state = {
            currentVersion: app.getVersion(),
            latestVersion: '',
            minimumVersion,
            required: false,
            available: false,
            phase: 'idle',
            installerUrl: '',
            releaseNotes: '',
            checkedAt: null,
            error: '',
        };
        this.loadCache();
    }
    getState() {
        return { ...this.state };
    }
    set(patch) {
        this.state = { ...this.state, ...patch };
        this.notify(this.getState());
        return this.getState();
    }
    loadCache() {
        if (!this.cachePath) return;
        try {
            const saved = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
            versionParts(saved.minimumVersion);
            if (saved.latestVersion) {
                versionParts(saved.latestVersion);
                if (compareVersions(saved.minimumVersion, saved.latestVersion) > 0) return;
                this.state.latestVersion = saved.latestVersion;
                this.state.installerUrl = downloadUrl(saved.latestVersion, 'Hintio-' + saved.latestVersion + '.Setup.exe');
            }
            if (compareVersions(saved.minimumVersion, this.state.minimumVersion) > 0) this.state.minimumVersion = saved.minimumVersion;
            this.state.required = compareVersions(this.state.currentVersion, this.state.minimumVersion) < 0;
            this.state.available = Boolean(this.state.latestVersion && compareVersions(this.state.latestVersion, this.state.currentVersion) > 0);
        } catch {
            /* A missing cache must not prevent startup. */
        }
    }
    saveCache() {
        if (!this.cachePath) return;
        try {
            fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
            const temporary = this.cachePath + '.tmp';
            fs.writeFileSync(temporary, JSON.stringify({ latestVersion: this.state.latestVersion, minimumVersion: this.state.minimumVersion }));
            fs.renameSync(temporary, this.cachePath);
        } catch {
            /* Cache failures do not invalidate an otherwise verified update. */
        }
    }
    async response(url) {
        const result = await this.fetch(url, {
            headers: { Accept: 'application/json', 'User-Agent': 'Hintio-updater' },
            signal: AbortSignal.timeout(10_000),
            cache: 'no-store',
        });
        if (!result.ok) throw new Error('Update check is unavailable. Check your connection and retry.');
        return result;
    }
    async check() {
        if (this.checkPromise) return this.checkPromise;
        this.checkPromise = this.performCheck().finally(() => {
            this.checkPromise = null;
        });
        return this.checkPromise;
    }
    async performCheck() {
        this.set({ phase: 'checking', error: '' });
        try {
            const release = releaseInfo(await (await this.response(RELEASES_URL)).json());
            let minimumVersion = this.state.minimumVersion;
            try {
                const policy = await (await this.response(POLICY_URL)).json();
                if (policy.schemaVersion !== 1) throw new Error('Unknown update policy');
                versionParts(policy.minimumSupportedVersion);
                if (compareVersions(policy.minimumSupportedVersion, release.latestVersion) > 0) throw new Error('Minimum version is not published');
                minimumVersion =
                    compareVersions(policy.minimumSupportedVersion, this.minimumBaseline) >= 0
                        ? policy.minimumSupportedVersion
                        : this.minimumBaseline;
            } catch {
                /* Keep the last valid minimum during a policy outage. */
            }
            const available = compareVersions(release.latestVersion, this.state.currentVersion) > 0;
            const result = this.set({
                ...release,
                minimumVersion,
                available,
                required: compareVersions(this.state.currentVersion, minimumVersion) < 0,
                phase: available ? 'available' : 'current',
                checkedAt: this.now(),
                error: '',
            });
            this.saveCache();
            return result;
        } catch (error) {
            return this.set({
                phase: 'error',
                error: error.message,
                required: compareVersions(this.state.currentVersion, this.state.minimumVersion) < 0,
            });
        }
    }
    async assertSessionAllowed() {
        if (!this.state.checkedAt) await this.check();
        if (this.state.required) throw new Error('Update required. Open Updates to install a supported Hintio version before starting a session.');
    }
    async openInstaller() {
        if (this.openPromise) return this.openPromise;
        this.openPromise = this.performOpenInstaller().finally(() => {
            this.openPromise = null;
        });
        return this.openPromise;
    }
    async performOpenInstaller() {
        try {
            if (!this.state.installerUrl) await this.check();
            if (!this.state.latestVersion || !this.state.installerUrl)
                throw new Error('The installer link is unavailable. Check for updates and retry.');
            const url = downloadUrl(this.state.latestVersion, 'Hintio-' + this.state.latestVersion + '.Setup.exe');
            if (typeof this.openExternal !== 'function') throw new Error('The browser could not be opened. Please retry.');
            await this.openExternal(url);
            return this.set({ error: '', notice: 'Installer link opened. Close Hintio, run the downloaded installer, then reopen the app.' });
        } catch (error) {
            return this.set({ error: error.message });
        }
    }
}
module.exports = { UpdateService, versionParts, compareVersions, releaseInfo, downloadUrl, RELEASES_URL, POLICY_URL };
