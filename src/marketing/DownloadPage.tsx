import { ArrowUpRight, Download, Monitor } from 'lucide-react';
import { productionRelease } from '../lib/productionRelease';

const preview = {
    version: '1.0.10',
    releaseUrl: 'https://github.com/Shomesh007/hintio/releases/tag/v1.0.10-preview.1',
    assetsUrl: 'https://github.com/Shomesh007/hintio/releases/download/v1.0.10-preview.1',
};

export default function DownloadPage() {
    return (
        <div className="wrap download-page">
            <header className="page-hero">
                <span className="eyebrow">WINDOWS DESKTOP APP</span>
                <h1>Download Hintio</h1>
                <p>Install Hintio, open the app, and enter your access key to start a session.</p>
            </header>

            <section className="download-builds" aria-label="Windows downloads">
                <article className="download-build download-build-preview">
                    <div className="download-build-meta">
                        <span>Latest preview</span>
                        <Monitor size={19} aria-hidden="true" />
                    </div>
                    <h2>Hintio {preview.version}</h2>
                    <p>Upgrade your existing Windows x64 installation, then open Hintio to refresh its taskbar icon.</p>
                    <ul>
                        <li>Folded Cue replaces the old Windows icon on upgrade.</li>
                        <li>AI Context uses the same layout as Settings and Feedback.</li>
                        <li>Long answers scroll inside the overlay at the size you set.</li>
                    </ul>
                    <a className="hi-btn hi-btn-ink" href={`${preview.assetsUrl}/Hintio-${preview.version}.Setup.exe`}>
                        Download preview <Download size={17} aria-hidden="true" />
                    </a>
                    <div className="download-build-links">
                        <a href={preview.releaseUrl}>Release notes <ArrowUpRight size={14} aria-hidden="true" /></a>
                        <a href={`${preview.assetsUrl}/SHA256SUMS.txt`}>SHA-256 checksum</a>
                    </div>
                </article>
                <article className="download-build">
                    <div className="download-build-meta"><span>Stable release</span></div>
                    <h2>Hintio {productionRelease.version}</h2>
                    <p>The production installer for Windows x64.</p>
                    <a className="hi-btn hi-btn-outline" href={productionRelease.windowsDownloadUrl}>
                        Download stable <Download size={17} aria-hidden="true" />
                    </a>
                    <p className="download-install-note">These Windows installers are unsigned. Smart App Control may block installation.</p>
                </article>
            </section>
            <div className="download-build-links download-help">
                <a href="/get-started">Installation and setup <ArrowUpRight size={14} aria-hidden="true" /></a>
                <a href="/pricing">Get or recover an access key <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
        </div>
    );
}
