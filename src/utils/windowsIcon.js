const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const appId = 'com.squirrel.Hintio.Hintio';

function refreshWindowsIcon({ executable, desktop, appData, shell, log = console }) {
    const versionDir = path.dirname(executable);
    const installDir = path.dirname(versionDir);
    const launcher = path.join(installDir, 'Hintio.exe');
    if (!/^app-\d+\.\d+\.\d+(?:[-.][\w.-]+)?$/i.test(path.basename(versionDir)) || !fs.existsSync(path.join(installDir, 'Update.exe'))) {
        return null;
    }

    const ico = fs.readFileSync(path.join(__dirname, '../assets/logo.ico'));
    const revision = createHash('sha256').update(ico).digest('hex').slice(0, 12);
    const iconPath = path.join(installDir, `hintio-icon-${revision}.ico`);
    for (const destination of [iconPath, path.join(installDir, 'app.ico')]) {
        if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(ico)) {
            fs.writeFileSync(destination, ico);
        }
    }

    const programs = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const pinned = path.join(appData, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar');
    const shortcuts = [path.join(desktop, 'Hintio.lnk'), path.join(programs, 'Hintio.lnk'), path.join(programs, 'Hintio', 'Hintio.lnk')];
    if (fs.existsSync(pinned)) {
        shortcuts.push(...fs.readdirSync(pinned).filter(name => path.extname(name).toLowerCase() === '.lnk').map(name => path.join(pinned, name)));
    }
    for (const shortcut of shortcuts) {
        if (!fs.existsSync(shortcut)) continue;
        try {
            const details = shell.readShortcutLink(shortcut);
            const target = path.resolve(details.target).toLowerCase();
            const previousVersion =
                path.basename(target) === 'hintio.exe' &&
                path.dirname(path.dirname(target)) === installDir.toLowerCase() &&
                /^app-\d+\.\d+\.\d+/i.test(path.basename(path.dirname(target)));
            const updaterShortcut =
                target === path.join(installDir, 'Update.exe').toLowerCase() && /^--processStart(?:=|\s+)"?Hintio\.exe"?(?:\s|$)/i.test(details.args || '');
            if (target !== launcher.toLowerCase() && !previousVersion && !updaterShortcut) continue;

            const updateTarget = previousVersion && fs.existsSync(launcher);
            if (details.icon?.toLowerCase() === iconPath.toLowerCase() && details.iconIndex === 0 && !updateTarget) continue;
            const updated = shell.writeShortcutLink(shortcut, 'update', {
                icon: iconPath,
                iconIndex: 0,
                ...(updateTarget ? { target: launcher } : {}),
            });
            if (!updated) log.warn('[Hintio] Windows could not refresh a shortcut icon.');
        } catch (error) {
            log.warn('[Hintio] Windows shortcut icon refresh failed:', error.message);
        }
    }
    return { appId, iconPath };
}

module.exports = { refreshWindowsIcon };
