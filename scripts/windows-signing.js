const fs = require('node:fs');
function windowsSigningOptions(env = process.env, fileExists = fs.existsSync) {
    const certificateFile = String(env.WIN_CSC_LINK || '').trim();
    const signWithParams = String(env.WIN_SIGN_WITH_PARAMS || '').trim();
    const required = env.HINTIO_REQUIRE_SIGNED_RELEASE === '1';
    if (certificateFile && signWithParams) throw new Error('Configure either a certificate file or hardware/cloud signing parameters, not both.');
    if (!certificateFile && !signWithParams) {
        if (required)
            throw new Error(
                'A trusted Windows code-signing certificate or signing service must be configured before building a signed public release.'
            );
        return undefined;
    }
    if (certificateFile && !fileExists(certificateFile)) throw new Error('The configured Windows signing certificate file does not exist.');
    const options = {
        hashes: ['sha256'],
        timestampServer: String(env.WIN_TIMESTAMP_SERVER || 'http://timestamp.digicert.com'),
        continueOnError: false,
    };
    if (certificateFile) {
        options.certificateFile = certificateFile;
        options.certificatePassword = env.WIN_CSC_KEY_PASSWORD || undefined;
    } else {
        options.signWithParams = signWithParams;
    }
    if (env.WIN_SIGNTOOL_PATH) options.signToolPath = env.WIN_SIGNTOOL_PATH;
    return options;
}
module.exports = { windowsSigningOptions };
