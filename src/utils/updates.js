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
    if (!['RELEASES', 'Hintio-' + version + '-full.nupkg', 'Hintio-' + version + '.Setup.exe'].includes(name))
        throw new Error('Untrusted update asset');
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
        feedReady: assets.has('RELEASES') && assets.has('Hintio-' + version + '-full.nupkg'),
    };
}
function releaseManifestValid(text, version) {
    const filename = 'Hintio-' + version + '-full.nupkg';
    return String(text)
        .trim()
        .split(/\r?\n/)
        .some(line => {
            const parts = line.trim().split(/\s+/);
            return parts.length === 3 && /^[a-f\d]{40}$/i.test(parts[0]) && parts[1] === filename && /^\d+$/.test(parts[2]) && Number(parts[2]) > 0;
        });
}
class UpdateService {
    constructor({
        app,
        autoUpdater,
        notify = () => {},
        fetchImpl = global.fetch,
        cachePath,
        minimumVersion = '1.0.4',
        platform = process.platform,
        installed,
        isSessionActive = async () => false,
        now = Date.now,
        firstRun = process.argv.includes('--squirrel-firstrun'),
    }) {
        versionParts(app.getVersion());
        versionParts(minimumVersion);
        this.app = app;
        this.updater = autoUpdater;
        this.notify = notify;
        this.fetch = fetchImpl;
        this.cachePath = cachePath;
        this.isSessionActive = isSessionActive;
        this.now = now;
        this.minimumBaseline = minimumVersion;
        this.nativeReadyAt = firstRun ? now() + 10_000 : 0;
        this.checkPromise = null;
        this.downloadPromise = null;
        this.downloadBusy = false;
        const nativeInstalled =
            installed ??
            (platform === 'win32' && app.isPackaged && fs.existsSync(path.resolve(path.dirname(app.getPath('exe')), '..', 'Update.exe')));
        this.state = {
            currentVersion: app.getVersion(),
            latestVersion: '',
            minimumVersion,
            required: false,
            available: false,
            phase: 'idle',
            installerUrl: '',
            releaseNotes: '',
            feedReady: false,
            supported: Boolean(nativeInstalled && autoUpdater),
            checkedAt: null,
            error: '',
        };
        this.loadCache();
        if (this.updater) {
            this.updater.on('update-available', () => {
                if (this.downloadBusy) this.set({ phase: 'downloading', error: '' });
            });
            this.updater.on('update-not-available', () => {
                if (!this.downloadBusy) return;
                this.downloadBusy = false;
                this.set({ phase: 'error', error: 'The update feed is not ready. Check again in a moment.' });
            });
            this.updater.on('update-downloaded', () => {
                if (!this.downloadBusy) return;
                this.downloadBusy = false;
                this.set({ phase: 'ready', error: '' });
            });
            this.updater.on('error', () => {
                if (!this.downloadBusy) return;
                this.downloadBusy = false;
                this.set({ phase: 'error', error: 'The update could not be downloaded. Check your connection and retry.' });
            });
        }
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
        if (this.downloadBusy || ['ready', 'installing'].includes(this.state.phase)) return this.getState();
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
        if (!this.state.checkedAt && !this.downloadBusy) await this.check();
        if (this.state.required) throw new Error('Update required. Open Updates to install a supported Hintio version before starting a session.');
    }
    async download() {
        if (this.downloadPromise) return this.downloadPromise;
        if (this.downloadBusy || this.state.phase === 'ready') return this.getState();
        this.downloadPromise = this.performDownload().finally(() => {
            this.downloadPromise = null;
        });
        return this.downloadPromise;
    }
    async performDownload() {
        try {
            await this.check();
            if (!this.state.latestVersion || compareVersions(this.state.latestVersion, this.state.currentVersion) <= 0) return this.getState();
            if (!this.state.supported)
                throw new Error('In-app installation requires the installed Windows app. Use the installer link for this copy.');
            if (!this.state.feedReady) throw new Error('This release does not include an in-app update package. Use the installer link.');
            const response = await this.response(downloadUrl(this.state.latestVersion, 'RELEASES'));
            if (!releaseManifestValid(await response.text(), this.state.latestVersion))
                throw new Error('The update manifest is invalid. Installation was stopped.');
            if (this.now() < this.nativeReadyAt) throw new Error('Windows is finishing the first installation. Wait a few seconds and try again.');
            this.downloadBusy = true;
            this.set({ phase: 'downloading', error: '' });
            this.updater.setFeedURL({ url: DOWNLOAD_ROOT + 'v' + this.state.latestVersion + '/' });
            this.updater.checkForUpdates();
            return this.getState();
        } catch (error) {
            this.downloadBusy = false;
            return this.set({ phase: 'error', error: error.message });
        }
    }
    async install() {
        if (this.state.phase !== 'ready') return this.set({ error: 'Download the update before installing it.' });
        if (await this.isSessionActive()) return this.set({ error: 'End your active session before restarting Hintio.' });
        if (this.state.phase !== 'ready') return this.getState();
        this.set({ phase: 'installing', error: '' });
        try {
            this.updater.quitAndInstall();
        } catch {
            this.set({ phase: 'ready', error: 'Installation could not start. Close Hintio and try again.' });
        }
        return this.getState();
    }
}
module.exports = { UpdateService, versionParts, compareVersions, releaseInfo, releaseManifestValid, downloadUrl, RELEASES_URL, POLICY_URL };
