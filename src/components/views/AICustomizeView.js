import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class AICustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .page-title,
            .page-subtitle,
            h2.surface-title {
                margin: 0;
            }

            .page-subtitle,
            .form-help {
                color: var(--text-secondary);
            }

            .surface-header .icon {
                color: var(--accent);
                font-size: 16px;
            }

            .form-grid {
                gap: 14px;
            }

            .form-group {
                flex-wrap: wrap;
            }

            .field-label {
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                font-weight: var(--font-weight-medium);
            }

            .form-help {
                margin: 4px 0 0;
            }

            .control {
                max-width: 100%;
            }

            input.control,
            textarea.control {
                cursor: text;
                user-select: text;
            }

            textarea.control {
                min-height: 120px;
            }

            .resume-name {
                overflow-wrap: anywhere;
            }

            .resume-details {
                flex: 1 1 220px;
                min-width: 0;
            }

            .resume-actions {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-sm);
            }

            .resume-actions button {
                padding: 7px 12px;
                border: 1px solid var(--border-strong);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                cursor: pointer;
            }

            .resume-actions button:hover:not(:disabled) {
                background: var(--bg-hover);
            }

            .resume-actions button:disabled {
                opacity: 0.55;
                cursor: wait;
            }

            .resume-error {
                margin: 10px 0 0;
                color: #f87171;
                font-size: var(--font-size-sm);
            }
        `,
    ];

    static properties = {
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        _context: { state: true },
        _resumeFileName: { state: true },
        _resumeParsing: { state: true },
        _resumeError: { state: true },
        _domain: { state: true },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this._context = '';
        this._domain = '';
        this._resumeFileName = '';
        this._resumeParsing = false;
        this._resumeError = '';
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await hintio.storage.getPreferences();
            this._context = prefs.customPrompt || '';
            this._domain = prefs.interviewDomain || '';
            this._resumeFileName = prefs.resumeFileName || '';
            // resumeText is stored separately — never shown in the textarea
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading AI customize storage:', error);
        }
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    async _saveContext(val) {
        this._context = val;
        await hintio.storage.updatePreference('customPrompt', val);
    }

    // The field the interview is in. Everything terminology-sensitive keys off
    // this, so it is worth asking for directly rather than inferring.
    async _saveDomain(val) {
        this._domain = val;
        await hintio.storage.updatePreference('interviewDomain', val);
    }

    async _handleResumeUpload() {
        if (this._resumeParsing) return;
        try {
            const ipcRenderer = window.electronAPI;
            const filePath = await ipcRenderer.invoke('open-file-dialog', {
                title: 'Select Resume',
                filters: [{ name: 'Documents', extensions: ['pdf', 'docx'] }],
                properties: ['openFile'],
            });
            if (!filePath) return;

            this._resumeParsing = true;
            this._resumeError = '';
            this.requestUpdate();

            const { text, fileName } = await ipcRenderer.invoke('parse-document', filePath);

            // Clean up extracted text — stored separately, never shown in textarea
            const cleaned = text
                .replace(/\r\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            this._resumeFileName = fileName;
            // Save resume text to its own key, not into customPrompt
            await hintio.storage.updatePreference('resumeText', cleaned);
            await hintio.storage.updatePreference('resumeFileName', fileName);
            this._resumeParsing = false;
            this.requestUpdate();
        } catch (err) {
            console.error('Resume parse error:', err);
            this._resumeError = err.message || 'Failed to parse document';
            this._resumeParsing = false;
            this.requestUpdate();
        }
    }

    async _clearResume() {
        this._resumeFileName = '';
        this._resumeError = '';
        await hintio.storage.updatePreference('resumeText', '');
        await hintio.storage.updatePreference('resumeFileName', '');
        this.requestUpdate();
    }

    render() {
        const profiles = [
            { value: 'interview', label: 'Job Interview' },
            { value: 'technical-interview', label: 'Technical Interview' },
            { value: 'sales', label: 'Sales Call' },
            { value: 'meeting', label: 'Business Meeting' },
            { value: 'presentation', label: 'Presentation' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'exam', label: 'Exam Assistant' },
        ];
        const activeProfile = this.selectedProfile === 'frontend-interview' ? 'technical-interview' : this.selectedProfile;
        if (!profiles.some(profile => profile.value === activeProfile)) {
            profiles.push({ value: activeProfile, label: activeProfile });
        }

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <header>
                        <h1 class="page-title">AI Context</h1>
                        <p class="page-subtitle">Choose what Hintio uses to tailor answers for your next session.</p>
                    </header>

                    <section class="surface" aria-labelledby="session-heading">
                        <div class="surface-header">
                            <hintio-icon class="icon" name="tune" aria-hidden="true"></hintio-icon>
                            <h2 class="surface-title" id="session-heading">Session setup</h2>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="field-label" for="session-profile">Session profile</label>
                                <select class="control" id="session-profile" @change=${this._handleProfileChange}>
                                    ${profiles.map(
                                        ({ value, label }) => html`<option value=${value} .selected=${value === activeProfile}>${label}</option>`
                                    )}
                                </select>
                            </div>
                            <div class="form-group">
                                <div>
                                    <label class="field-label" for="interview-domain">Interview field</label>
                                    <p class="form-help" id="domain-help">Optional. Helps Hintio use the right terminology.</p>
                                </div>
                                <input
                                    id="interview-domain"
                                    class="control"
                                    type="text"
                                    placeholder="e.g. Backend engineering"
                                    aria-describedby="domain-help"
                                    .value=${this._domain}
                                    @input=${e => this._saveDomain(e.target.value)}
                                />
                            </div>
                        </div>
                    </section>

                    <section class="surface" aria-labelledby="resume-heading">
                        <div class="surface-header">
                            <hintio-icon class="icon" name="menu_book" aria-hidden="true"></hintio-icon>
                            <h2 class="surface-title" id="resume-heading">Resume</h2>
                        </div>
                        <div class="form-group">
                            <div class="resume-details">
                                <div class="field-label resume-name" role="status">
                                    ${this._resumeParsing ? 'Reading document…' : this._resumeFileName || 'No file attached'}
                                </div>
                                <p class="form-help">PDF or DOCX. The extracted text is included in your session context.</p>
                            </div>
                            <div class="resume-actions">
                                <button type="button" ?disabled=${this._resumeParsing} @click=${this._handleResumeUpload}>
                                    ${this._resumeFileName ? 'Replace file' : 'Choose file'}
                                </button>
                                ${this._resumeFileName
                                    ? html`<button type="button" ?disabled=${this._resumeParsing} @click=${this._clearResume}>Remove</button>`
                                    : ''}
                            </div>
                        </div>
                        ${this._resumeError ? html`<p class="resume-error" role="alert">${this._resumeError}</p>` : ''}
                    </section>

                    <section class="surface" aria-labelledby="instructions-heading">
                        <div class="surface-header">
                            <hintio-icon class="icon" name="edit_note" aria-hidden="true"></hintio-icon>
                            <label class="surface-title" id="instructions-heading" for="custom-instructions">Custom instructions</label>
                        </div>
                        <textarea
                            id="custom-instructions"
                            class="control"
                            placeholder="Paste a job description, add background, or describe how you want answers written."
                            aria-describedby="instructions-help"
                            .value=${this._context}
                            @input=${e => this._saveContext(e.target.value)}
                        ></textarea>
                        <p class="form-help" id="instructions-help">Saved as you type.</p>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('ai-customize-view', AICustomizeView);
