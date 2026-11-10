import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

export class UpdatesView extends LitElement {
    static properties = {
        state: { type: Object },
        onCheck: {},
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
    }
    render() {
        const s = this.state || {};
        const busy = s.phase === 'checking';
        const available = Boolean(s.available || s.required);
        const title = s.required ? 'An update is required.' : available ? 'A newer Hintio is ready.' : 'Keep Hintio up to date.';
        const intro = s.required
            ? 'This version is no longer supported for new sessions. Download the latest installer to continue.'
            : 'Check what’s new and download the latest Windows installer from the official Hintio release.';
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
                ${available && s.installerUrl
                    ? html`<button class="primary" ?disabled=${busy} @click=${() => this.onOpenInstaller?.()}>Download latest version ↗</button>`
                    : ''}
                <button ?disabled=${busy} @click=${() => this.onCheck?.()}>${busy ? 'Checking…' : 'Check for updates'}</button>
                ${!s.required
                    ? html`<button @click=${() => this.onBack?.()}>Back to Hintio</button>`
                    : html`<button @click=${() => this.onQuit?.()}>Quit Hintio</button>`}
            </div>
            ${s.phase === 'current' ? html`<p class="status" role="status">You’re up to date.</p>` : ''}
            ${s.error ? html`<p class="status error" role="alert">${s.error}</p>` : ''}
            ${s.notice ? html`<p class="status" role="status">${s.notice}</p>` : ''}
            <p class="note">
                The download opens in your browser. Finish your session, close Hintio, run the downloaded installer, then reopen the app. Settings and
                history are kept. Hintio does not download, install, or restart itself.
            </p>
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
