import '../icons/HintioIcon.js';
import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_EMAIL_URL, SUPPORT_WHATSAPP_URL } from '../../utils/supportDetails.js';

export class HelpView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .support-eyebrow {
                color: var(--text-secondary);
                font-size: 10px;
                letter-spacing: 0.14em;
            }
            .contact-title {
                font-size: 25px;
                letter-spacing: -0.04em;
                margin: 10px 0;
                font-weight: 600;
            }
            .contact-intro {
                font-size: 13px;
                color: var(--text-secondary);
                line-height: 1.6;
                margin: 0 0 16px;
            }
            .contact-surface {
                border-top: 2px solid var(--accent);
            }
            .contact-line {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                gap: 8px 18px;
                padding: 13px 0;
                border-top: 1px solid var(--border);
                font-size: 13px;
            }
            .contact-line > span {
                color: var(--text-secondary);
            }
            .contact-line a {
                color: var(--text-primary);
                text-underline-offset: 4px;
                cursor: pointer;
                overflow-wrap: anywhere;
            }
            .selectable,
            .contact-line a {
                user-select: text;
            }
            .contact-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 12px 0;
            }
            .contact-button {
                min-height: 38px;
                border: 1px solid var(--accent);
                border-radius: 6px;
                background: var(--accent);
                color: white;
                padding: 8px 12px;
                font: inherit;
                font-size: 12px;
                cursor: pointer;
            }
            .contact-button.secondary {
                background: transparent;
                border-color: var(--border-strong);
                color: var(--text-primary);
            }
            .contact-button:focus-visible,
            .contact-line a:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: 3px;
            }
            .contact-note,
            .contact-status {
                font-size: 12px;
                line-height: 1.65;
                color: var(--text-secondary);
                margin: 8px 0 0;
            }
            .contact-status:empty {
                display: none;
            }
            /* ── Material icon helper ── */
            .icon {
                font-family: inherit;
                font-size: 20px;
                font-weight: normal;
                font-style: normal;
                line-height: 1;
                font-variation-settings:
                    'FILL' 1,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 20;
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            /* ── Shortcuts ── */
            .shortcut-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 4px;
            }

            .shortcut-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-sm);
                padding: 8px 10px;
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                transition: background var(--transition);
            }

            .shortcut-row:hover {
                background: var(--bg-hover);
            }

            .shortcut-label {
                color: var(--text-secondary);
                font-size: 12px;
            }

            .shortcut-keys {
                display: inline-flex;
                gap: 3px;
                flex-wrap: nowrap;
                justify-content: flex-end;
                flex-shrink: 0;
            }

            .key {
                border: 1px solid var(--border-strong);
                border-radius: 4px;
                padding: 1px 5px;
                font-size: 10px;
                color: var(--text-secondary);
                background: var(--bg-surface);
                font-family: var(--font-mono);
                white-space: nowrap;
            }

            /* ── Tips grid ── */
            .tips-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-sm);
            }

            .tip-card {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                padding: 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
            }

            .tip-icon-wrap {
                width: 30px;
                height: 30px;
                border-radius: 8px;
                background: rgba(99, 102, 241, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .tip-icon-wrap .icon {
                font-size: 16px;
                color: #6366f1;
                font-variation-settings:
                    'FILL' 1,
                    'wght' 400,
                    'GRAD' 0,
                    'opsz' 20;
            }

            .tip-text {
                flex: 1;
            }

            .tip-title {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 2px;
            }

            .tip-desc {
                font-size: 11px;
                color: var(--text-muted);
                line-height: 1.4;
            }

            @media (max-width: 480px) {
                .shortcut-grid,
                .tips-grid {
                    grid-template-columns: 1fr;
                }
            }
        `,
    ];

    static properties = {
        onExternalLinkClick: { type: Function },
        contactStatus: { type: String },
        keybinds: { type: Object },
    };

    constructor() {
        super();
        this.contactStatus = '';
        this.onExternalLinkClick = async url => window.electronAPI?.invoke('open-external', url);
        this.keybinds = this.getDefaultKeybinds();
        this._loadKeybinds();
    }

    async _loadKeybinds() {
        try {
            const keybinds = await hintio.storage.getKeybinds();
            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading keybinds:', error);
        }
    }

    async openSupport(url) {
        try {
            const result = await this.onExternalLinkClick(url);
            if (result?.success === false) throw new Error('Could not open your default application.');
            this.contactStatus = '';
        } catch {
            this.contactStatus = 'Could not open this link. Copy the contact details below instead.';
        }
    }

    async copyPhone() {
        try {
            await navigator.clipboard.writeText(SUPPORT_PHONE);
            this.contactStatus = 'Phone number copied.';
        } catch {
            this.contactStatus = 'Copy was unavailable. Select the phone number below to copy it manually.';
        }
    }

    getDefaultKeybinds() {
        const isMac = hintio.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            dualScreenshot: isMac ? 'Cmd+Shift+Enter' : 'Ctrl+Shift+Enter',
            dualScreenshotFinish: isMac ? 'Cmd+Shift+F' : 'Ctrl+Shift+F',
            debugScreenshot: isMac ? 'Cmd+Shift+D' : 'Ctrl+Shift+D',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    _formatKeybind(keybind) {
        return keybind.split('+').map(key => html`<span class="key">${key}</span>`);
    }

    render() {
        const shortcutRows = [
            ['Move Up', this.keybinds.moveUp],
            ['Move Down', this.keybinds.moveDown],
            ['Move Left', this.keybinds.moveLeft],
            ['Move Right', this.keybinds.moveRight],
            ['Toggle Visibility', this.keybinds.toggleVisibility],
            ['Click-through', this.keybinds.toggleClickThrough],
            ['Next Step', this.keybinds.nextStep],
            ['Multi Screenshot Answer (Max 3)', this.keybinds.dualScreenshot],
            ['Finish Multi Screenshot Batch', this.keybinds.dualScreenshotFinish],
            ['Debug Failed Test Screenshot', this.keybinds.debugScreenshot],
            ['Prev Response', this.keybinds.previousResponse],
            ['Next Response', this.keybinds.nextResponse],
            ['Scroll Up', this.keybinds.scrollUp],
            ['Scroll Down', this.keybinds.scrollDown],
        ];

        const tips = [
            {
                icon: 'mouse',
                title: 'Click-through control',
                desc: 'Let mouse clicks pass through the overlay to the app underneath. This does not control screen-sharing visibility.',
            },
            { icon: 'keyboard_tab', title: 'Ask Next Step', desc: 'Press the shortcut mid-interview to get contextual guidance without typing.' },
            { icon: 'crop_free', title: 'Dock Window', desc: 'Use dock shortcuts to snap the window to corners so it stays out of your way.' },
            {
                icon: 'auto_awesome',
                title: 'AI Context',
                desc: 'Set a custom system prompt to tune the AI persona to your specific interview style.',
            },
        ];

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div class="page-title">Help & Contact</div>
                    <section class="surface contact-surface" aria-labelledby="contact-title">
                        <div class="support-eyebrow">CONTACT HINTIO</div>
                        <h2 id="contact-title" class="contact-title">A direct line to help.</h2>
                        <p class="contact-intro">For setup, desktop access, bugs, or questions about your data.</p>
                        <div class="contact-line">
                            <span>Email</span>
                            <a
                                href=${SUPPORT_EMAIL_URL}
                                @click=${event => {
                                    event.preventDefault();
                                    this.openSupport(SUPPORT_EMAIL_URL);
                                }}
                                >${SUPPORT_EMAIL}</a
                            >
                        </div>
                        <div class="contact-line">
                            <span>Phone / WhatsApp</span>
                            <strong class="selectable">${SUPPORT_PHONE}</strong>
                        </div>
                        <div class="contact-actions">
                            <button class="contact-button" @click=${() => this.openSupport(SUPPORT_WHATSAPP_URL)}>
                                Open WhatsApp <span aria-hidden="true">↗</span>
                            </button>
                            <button class="contact-button secondary" @click=${this.copyPhone}>Copy phone number</button>
                        </div>
                        <p class="contact-note">
                            Include your app version, operating system, and steps to reproduce a problem. Keep API keys, access keys, payment details,
                            and private conversation content out of your message.
                        </p>
                        <p class="contact-status" role="status">${this.contactStatus}</p>
                    </section>

                    <!-- Tips -->
                    <section class="surface">
                        <div class="surface-header">
                            <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="lightbulb"></hintio-icon>
                            <div class="surface-title">Pro Tips</div>
                        </div>
                        <div class="tips-grid">
                            ${tips.map(
                                tip => html`
                                    <div class="tip-card">
                                        <div class="tip-icon-wrap">
                                            <hintio-icon class="icon" name=${tip.icon}></hintio-icon>
                                        </div>
                                        <div class="tip-text">
                                            <div class="tip-title">${tip.title}</div>
                                            <div class="tip-desc">${tip.desc}</div>
                                        </div>
                                    </div>
                                `
                            )}
                        </div>
                    </section>

                    <!-- Keyboard shortcuts -->
                    <section class="surface">
                        <div class="surface-header">
                            <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="keyboard"></hintio-icon>
                            <div class="surface-title">Keyboard Shortcuts</div>
                        </div>
                        <div class="shortcut-grid">
                            ${shortcutRows.map(
                                ([label, keys]) => html`
                                    <div class="shortcut-row">
                                        <span class="shortcut-label">${label}</span>
                                        <span class="shortcut-keys">${this._formatKeybind(keys)}</span>
                                    </div>
                                `
                            )}
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('help-view', HelpView);
