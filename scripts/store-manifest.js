const fs = require('node:fs');
const path = require('node:path');
function xml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}
function storeVersion(version) {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw new Error('A stable three-part version is required');
    const parts = version.split('.').map(Number);
    if (!parts[0] || parts.some(n => n > 65535)) throw new Error('Store version components must fit the Windows version range');
    return version + '.0';
}
function identityFromEnv(env = process.env, validation = false) {
    const values = {
        name: env.HINTIO_STORE_IDENTITY_NAME,
        publisher: env.HINTIO_STORE_PUBLISHER,
        publisherDisplayName: env.HINTIO_STORE_PUBLISHER_DISPLAY_NAME,
    };
    if (validation)
        return {
            name: 'Hintio.ValidationOnly',
            publisher: 'CN=Hintio Validation Only',
            publisherDisplayName: 'Hintio validation only',
            validationOnly: true,
        };
    if (Object.values(values).some(v => typeof v !== 'string' || !v.trim()))
        throw new Error('Partner Center identity required: HINTIO_STORE_IDENTITY_NAME, HINTIO_STORE_PUBLISHER, HINTIO_STORE_PUBLISHER_DISPLAY_NAME');
    if (
        !/^[A-Za-z0-9.-]{3,50}$/.test(values.name) ||
        !/^CN=.{1,250}$/.test(values.publisher) ||
        /[\r\n]/.test(values.publisher) ||
        values.publisherDisplayName.length > 256
    )
        throw new Error('Invalid Partner Center identity');
    if (/validation|placeholder|example/i.test(values.name) || /validation only/i.test(values.publisher))
        throw new Error('A real Partner Center reservation is required for submission');
    return { ...values, validationOnly: false };
}
function makeManifest(identity, version) {
    return `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10" xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10" xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities" IgnorableNamespaces="uap rescap">
<Identity Name="${xml(identity.name)}" Publisher="${xml(identity.publisher)}" Version="${storeVersion(version)}" ProcessorArchitecture="x64" />
<Properties><DisplayName>Hintio</DisplayName><PublisherDisplayName>${xml(identity.publisherDisplayName)}</PublisherDisplayName><Description>Screen and audio context assistant for meetings and learning</Description><Logo>assets\\StoreLogo.png</Logo></Properties>
<Resources><Resource Language="en-US" /></Resources>
<Dependencies><TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" /></Dependencies>
<Capabilities><Capability Name="internetClient" /><rescap:Capability Name="runFullTrust" /><DeviceCapability Name="microphone" /></Capabilities>
<Applications><Application Id="Hintio" Executable="app\\Hintio.exe" EntryPoint="Windows.FullTrustApplication"><uap:VisualElements DisplayName="Hintio" Description="Screen and audio context assistant" Square44x44Logo="assets\\Square44x44Logo.png" Square150x150Logo="assets\\Square150x150Logo.png" BackgroundColor="transparent" /></Application></Applications>
</Package>
`.replaceAll('\\\\', '\\');
}
function prepareStore(env = process.env) {
    const root = path.resolve(__dirname, '..');
    const validation = env.HINTIO_STORE_VALIDATION === '1';
    const identity = identityFromEnv(env, validation);
    const directory = path.join(root, 'out', 'store-config');
    fs.mkdirSync(directory, { recursive: true });
    const manifest = path.join(directory, 'AppxManifest.xml');
    fs.writeFileSync(manifest, makeManifest(identity, require('../package.json').version));
    return { identity, manifest, directory };
}
module.exports = { xml, storeVersion, identityFromEnv, makeManifest, prepareStore };
