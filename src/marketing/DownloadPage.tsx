import { ArrowUpRight, Download, Monitor } from 'lucide-react';
import { productionRelease } from '../lib/productionRelease';
import { previewRelease } from '../lib/previewRelease';

export default function DownloadPage({ onDownload, onPreviewDownload }: { onDownload: () => void; onPreviewDownload: () => void }) {
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
                    <h2>Hintio {previewRelease.version}</h2>
                    <p>Run the Windows x64 installer, then open Hintio.</p>
                    <ul>
                        <li>Get a free key from Pricing using the link below the access-key field.</li>
                        <li>Onboarding has a shorter Terms and Privacy Policy screen.</li>
                        <li>Usage analytics measures onboarding, activation, and session modes when the backend is available.</li>
                        <li>You can turn analytics off in Settings → Privacy &amp; Data.</li>
                    </ul>
                    <button type="button" className="hi-btn hi-btn-ink" onClick={onPreviewDownload}>
                        Download preview installer <Download size={17} aria-hidden="true" />
                    </button>
                    <div className="download-build-links">
                        <a href={previewRelease.releaseUrl}>Release notes <ArrowUpRight size={14} aria-hidden="true" /></a>
                        <a href={previewRelease.checksumUrl}>SHA-256 checksum</a>
                    </div>
                </article>
                <article className="download-build">
                    <div className="download-build-meta"><span>Stable release</span></div>
                    <h2>Hintio {productionRelease.version}</h2>
                    <p>The production installer for Windows x64.</p>
                    <button type="button" className="hi-btn hi-btn-outline" onClick={onDownload}>
                        Download stable <Download size={17} aria-hidden="true" />
                    </button>
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
