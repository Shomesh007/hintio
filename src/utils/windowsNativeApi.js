// Standard user-level Electron window controls. No focus or z-order enforcement loop.
function setWindowAsTopmost(window) {
    if (!window || window.isDestroyed()) return false;
    window.setAlwaysOnTop(true);
    return true;
}
function forceWindowToFront(window) {
    if (!window || window.isDestroyed()) return false;
    window.show();
    return true;
}
module.exports = { setWindowAsTopmost, forceWindowToFront };
