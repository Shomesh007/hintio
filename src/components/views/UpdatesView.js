import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class UpdatesView extends LitElement {
    static properties = {
        state: { type: Object },
        sessionActive: { type: Boolean },
        onCheck: {},
        onDownload: {},
        onInstall: {},
        onOpenInstaller: {},
        onBack: {},
        onQuit: {},
    };
    static styles = css`
        :host {
            display: block;
            height: 100%;
            min-height: 0;
            color: var(--text-primary, #f4f4f5);
            font-family: var(--font, system-ui);
        }
        * {
            box-sizing: border-box;
        }
        .page {
            max-width: 720px;
            height: 100%;
            overflow-y: auto;
            margin: 0 auto;
            padding: 32px 32px 48px;
        }
        .eyebrow {
            color: var(--accent, #a5b4fc);
            font-size: 10px;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 14px;
        }
        h1 {
            font-size: 30px;
            font-weight: 500;
            letter-spacing: -1px;
            line-height: 1.15;
            margin: 0 0 12px;
        }
        .intro {
            color: var(--text-secondary, #a1a1aa);
            font-size: 13px;
            line-height: 1.7;
            max-width: 530px;
            margin: 0 0 24px;
        }
        .versions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-top: 1px solid var(--border, #303036);
            border-bottom: 1px solid var(--border, #303036);
            padding: 18px 0;
            gap: 20px;
        }
        .label {
            display: block;
            color: #a1a1aa;
            font-size: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .version {
            font-size: 24px;
            font-family: monospace;
            letter-spacing: -1px;
        }
        .minimum {
            font-size: 11px;
            color: #a1a1aa;
            line-height: 1.6;
            margin-top: 14px;
        }
        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 22px;
            align-items: center;
        }
        button {
            border: 1px solid #42424a;
            border-radius: 5px;
            padding: 11px 16px;
            background: transparent;
            color: #e4e4e7;
            font: inherit;
            font-size: 12px;
            cursor: pointer;
        }
        button.primary {
            background: var(--accent, #a5b4fc);
            border-color: transparent;
            color: #101014;
            font-weight: 600;
        }
        button:disabled {
            opacity: 0.45;
            cursor: default;
        }
        button:focus-visible,
        summary:focus-visible {
            outline: 2px solid var(--accent, #a5b4fc);
            outline-offset: 4px;
        }
        .status {
            margin-top: 20px;
            font-size: 12px;
            line-height: 1.6;
        }
        .progress {
            height: 2px;
            background: #32323b;
            overflow: hidden;
            margin-top: 13px;
        }
        .progress::after {
            content: '';
            display: block;
            height: 100%;
            width: 35%;
            background: var(--accent, #a5b4fc);
            animation: travel 1.5s ease-in-out infinite alternate;
        }
        @keyframes travel {
            to {
                transform: translateX(185%);
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .progress::after {
                animation: none;
                width: 100%;
            }
        }
        .error {
            border-left: 2px solid #e0ad77;
            padding-left: 12px;
            color: #e8c7a4;
        }
        .note {
            color: #92929d;
            font-size: 11px;
            line-height: 1.7;
            margin: 17px 0 0;
        }
        .text-button {
            border: 0;
            padding: 4px 0;
            color: #b5b5c1;
            text-decoration: underline;
            text-underline-offset: 4px;
        }
        details {
            margin-top: 28px;
            border-top: 1px solid #303036;
            padding-top: 16px;
        }
        summary {
            cursor: pointer;
            color: #c8c8d0;
            font-size: 12px;
        }
        pre {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            color: #a1a1aa;
            font: 12px/1.8 var(--font, system-ui);
        }
        @media (max-width: 620px) {
            .page {
                padding: 24px 20px;
            }
            h1 {
                font-size: 25px;
            }
            .version {
                font-size: 21px;
            }
        }
    `;
    constructor() {
        super();
        this.state = {};
        this.sessionActive = false;
    }
    render() {
        const s = this.state || {};
        const busy = ['checking', 'downloading', 'installing'].includes(s.phase);
        const available = Boolean(s.available);
        const title =
            s.phase === 'ready'
                ? 'Ready when you are.'
                : s.required
                  ? 'An update is required.'
                  : available
                    ? 'A newer Hintio is ready.'
                    : 'Keep Hintio up to date.';
        const intro = s.required
            ? 'This version is no longer supported for new sessions. Install the latest version to continue. Your saved settings and history stay on this device.'
            : 'Get the latest improvements here, without opening a browser or running an installer yourself.';
        const nativeReady = s.supported && s.feedReady;
        return html`<section class="page" aria-labelledby="updates-title">
            <div class="eyebrow">Hintio / Updates</div>
            <h1 id="updates-title">${title}</h1>
            <p class="intro">${intro}</p>
            <div class="versions">
                <div><span class="label">Installed</span><span class="version">${s.currentVersion ? 'v' + s.currentVersion : 'Checking…'}</span></div>
                <div>
                    <span class="label">Latest release</span><span class="version">${s.latestVersion ? 'v' + s.latestVersion : 'Not checked'}</span>
                </div>
            </div>
            ${s.required
                ? html`<p class="minimum">
                      New sessions require v${s.minimumVersion} or newer. Existing session records remain available after updating.
                  </p>`
                : ''}
            <div class="actions">
                ${s.phase === 'ready'
                    ? html`<button class="primary" ?disabled=${this.sessionActive} @click=${() => this.onInstall?.()}>Restart & install</button>`
                    : available && nativeReady
                      ? html`<button class="primary" ?disabled=${busy} @click=${() => this.onDownload?.()}>
                            ${s.phase === 'downloading' ? 'Downloading update…' : 'Update in Hintio'}
                        </button>`
                      : ''}
                <button ?disabled=${busy || s.phase === 'ready'} @click=${() => this.onCheck?.()}>
                    ${s.phase === 'checking' ? 'Checking…' : 'Check for updates'}
                </button>
                ${!s.required
                    ? html`<button @click=${() => this.onBack?.()}>Back to Hintio</button>`
                    : html`<button @click=${() => this.onQuit?.()}>Quit Hintio</button>`}
            </div>
            ${s.phase === 'downloading'
                ? html`<div class="status" role="status">
                      Downloading and preparing the update. Keep Hintio open.
                      <div class="progress" role="progressbar" aria-label="Downloading Hintio update" aria-valuetext="Download in progress"></div>
                  </div>`
                : ''}
            ${s.phase === 'ready'
                ? html`<p class="status" role="status">
                      The update is downloaded. ${this.sessionActive ? 'End your session before restarting.' : 'Restart to finish installation.'}
                  </p>`
                : ''}
            ${s.phase === 'installing' ? html`<p class="status" role="status">Closing Hintio and installing the update…</p>` : ''}
            ${s.phase === 'current' ? html`<p class="status" role="status">You’re up to date.</p>` : ''}
            ${s.error ? html`<p class="status error" role="alert">${s.error}</p>` : ''}
            ${available && !nativeReady && s.installerUrl
                ? html`<p class="note">
                          ${!s.supported
                              ? 'This copy is not running from a Windows installation. Install it once to enable future in-app updates.'
                              : 'This release was published without an in-app update package.'}
                      </p>
                      <button class="text-button" @click=${() => this.onOpenInstaller?.(s.installerUrl)}>Open the Windows installer link ↗</button>`
                : ''}
            <p class="note">Hintio never restarts an active session automatically. Updates come from the official Hintio release repository.</p>
            ${s.releaseNotes
                ? html`<details>
                      <summary>What’s changed</summary>
                      <pre>${s.releaseNotes}</pre>
                  </details>`
                : ''}
        </section>`;
    }
}
customElements.define('updates-view', UpdatesView);
