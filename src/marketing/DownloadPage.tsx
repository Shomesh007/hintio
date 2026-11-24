import { ArrowUpRight, Download, Monitor } from 'lucide-react';
import { productionRelease } from '../lib/productionRelease';
import { trackWebEvent } from '../lib/productAnalytics';

const previewVersion = '1.0.11';
const previewTag = `v${previewVersion}-preview.1`;
const releaseBase = 'https://github.com/gurugsv7/skillissue/releases';
const releaseUrl = `${releaseBase}/tag/${previewTag}`;
const assetsUrl = `${releaseBase}/download/${previewTag}`;
const installerName = `Hintio-${previewVersion}.Setup.exe`;

export default function DownloadPage() {
    return (
        <div className="wrap download-page">
            <header className="page-hero">
                <span className="eyebrow">WINDOWS DESKTOP APP</span>
                <h1>Download Hintio</h1>
                <p>Download Hintio for Windows, open the app, and enter your access key to start a session.</p>
            </header>

            <section className="download-builds" aria-label="Windows downloads">
                <article className="download-build download-build-preview">
                    <div className="download-build-meta">
                        <span>Latest preview</span>
                        <Monitor size={19} aria-hidden="true" />
                    </div>
                    <h2>Hintio {previewVersion}</h2>
                    <p>Run the Windows x64 installer, then open Hintio.</p>
                    <ul>
                        <li>Onboarding has a shorter Terms and Privacy Policy screen.</li>
                        <li>Usage analytics measures onboarding, activation, and session modes when the backend is available.</li>
                        <li>You can turn analytics off in Settings → Privacy &amp; Data.</li>
                    </ul>
                    <a className="hi-btn hi-btn-ink" href={`${assetsUrl}/${installerName}`} onClick={() => trackWebEvent('download_clicked', 'preview')}>
                        Download preview installer <Download size={17} aria-hidden="true" />
                    </a>
                    <div className="download-build-links">
                        <a href={releaseUrl}>Release notes <ArrowUpRight size={14} aria-hidden="true" /></a>
                        <a href={`${assetsUrl}/SHA256SUMS.txt`}>SHA-256 checksum</a>
                    </div>
                </article>
                <article className="download-build">
                    <div className="download-build-meta"><span>Stable release</span></div>
                    <h2>Hintio {productionRelease.version}</h2>
                    <p>The production installer for Windows x64.</p>
                    <a className="hi-btn hi-btn-outline" href={productionRelease.windowsDownloadUrl} onClick={() => trackWebEvent('download_clicked', 'production')}>
                        Download stable <Download size={17} aria-hidden="true" />
                    </a>
                    <p className="download-install-note">These Windows builds are unsigned. Smart App Control may block them.</p>
                </article>
            </section>
            <div className="download-build-links download-help">
                <a href="/get-started">Installation and setup <ArrowUpRight size={14} aria-hidden="true" /></a>
                <a href="/pricing">Get or recover an access key <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
        </div>
    );
}
