const version = '1.0.13';
const tag = `v${version}-preview.1`;
const releases = 'https://github.com/Shomesh007/hintio/releases';
const assets = `${releases}/download/${tag}`;

export const previewRelease = {
    version,
    releaseUrl: `${releases}/tag/${tag}`,
    windowsDownloadUrl: `${assets}/Hintio-${version}.Setup.exe`,
    checksumUrl: `${assets}/SHA256SUMS.txt`,
};
