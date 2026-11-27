// Public release policy. Do not point buyers at the unsigned Store candidate.
const releaseAssets = 'https://github.com/Shomesh007/hintio/releases/download/v1.0.13';

export const productionRelease = Object.freeze({
    version: '1.0.13',
    windowsDownloadUrl: `${releaseAssets}/Hintio-1.0.13.Setup.exe`,
    checksumUrl: `${releaseAssets}/SHA256SUMS.txt`,
    storeCandidateVersion: '1.0.6',
    freeTrialsEnabled: true,
});
