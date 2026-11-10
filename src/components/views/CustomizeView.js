import '../icons/HintioIcon.js';
import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class CustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            /* ── Settings page header banner ── */
            .settings-banner {
                position: relative;
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                padding: 16px 20px;
                background: var(--bg-surface);
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 4px;
            }

            .settings-banner-title {
                font-size: var(--font-size-xl);
                font-weight: var(--font-weight-semibold);
                color: var(--text-primary);
                letter-spacing: -0.02em;
            }

            .settings-banner-sub {
                font-size: 11px;
                color: var(--text-muted);
                margin-top: 2px;
            }

            /* ── Danger surface ── */
            .danger-surface {
                border-color: rgba(239, 68, 68, 0.3) !important;
                background: rgba(239, 68, 68, 0.04) !important;
            }

            .danger-surface:hover {
                border-color: rgba(239, 68, 68, 0.5) !important;
                box-shadow: 0 4px 16px rgba(239, 68, 68, 0.1) !important;
            }

            .warning-callout {
                position: relative;
                margin-top: 4px;
                padding: 8px 12px;
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: var(--radius-sm);
                color: var(--danger);
                font-size: var(--font-size-xs);
                line-height: 1.4;
                background: rgba(239, 68, 68, 0.06);
            }

            /* ── Toggle row ── */
            .toggle-row {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                padding: var(--space-sm) 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
                transition:
                    border-color var(--transition),
                    background var(--transition);
            }

            .toggle-row:hover {
                border-color: var(--border-strong);
            }

            .toggle-input {
                width: 14px;
                height: 14px;
                accent-color: var(--accent);
                cursor: pointer;
            }

            .toggle-label {
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                cursor: pointer;
                user-select: none;
            }

            /* ── Slider ── */
            .slider-wrap {
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: var(--space-xs);
            }

            .slider-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-sm);
            }

            .slider-value {
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 2px 8px;
            }

            .slider-input {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 3px;
                border-radius: 2px;
                background: var(--border-strong);
                outline: none;
                cursor: pointer;
            }

            .slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: var(--accent);
                border: none;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
            }

            .slider-input::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: var(--accent);
                border: none;
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
            }

            /* ── Keybind ── */
            .keybind-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-sm) 0;
                border-bottom: 1px solid var(--border);
            }

            .keybind-row:last-of-type {
                border-bottom: none;
            }

            .keybind-name {
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
                font-family: var(--font-mono);
            }

            .keybind-input {
                width: 140px;
                text-align: center;
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                background: var(--bg-elevated) !important;
                border-color: var(--border) !important;
                color: var(--text-secondary) !important;
            }

            /* ── Danger button ── */
            .danger-button {
                border: 1px solid rgba(239, 68, 68, 0.4);
                color: var(--danger);
                background: transparent;
                border-radius: var(--radius-sm);
                padding: 9px 14px;
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition:
                    background var(--transition),
                    box-shadow var(--transition);
            }

            .danger-button:hover {
                background: rgba(239, 68, 68, 0.1);
                border-color: rgba(239, 68, 68, 0.65);
                box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
            }

            .danger-button:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .status {
                margin-top: var(--space-sm);
                padding: var(--space-sm);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border);
                font-size: var(--font-size-xs);
                font-family: var(--font-mono);
            }

            .privacy-intro {
                color: var(--text-secondary);
                font-size: 12px;
                line-height: 1.7;
                margin: 0 0 14px;
            }
            .data-flow {
                margin: 0;
            }
            .data-flow > div {
                padding: 14px 0;
                border-top: 1px solid var(--border);
            }
            .data-flow dt {
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 7px;
                color: var(--text-primary);
            }
            .data-flow dd {
                margin: 0;
                color: var(--text-secondary);
                font-size: 12px;
                line-height: 1.7;
            }
            .data-flow code {
                font-family: var(--font-mono);
                color: var(--text-primary);
            }
            .privacy-support {
                margin-top: 12px;
                padding-top: 14px;
                border-top: 1px solid var(--border);
                font-size: 12px;
            }
            .privacy-support p,
            .data-confirmation p {
                color: var(--text-secondary);
                line-height: 1.7;
            }
            .privacy-support .control,
            .data-confirmation .control {
                width: auto;
                min-height: 36px;
                cursor: pointer;
            }
            .data-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .data-confirmation {
                padding: 14px;
                border-left: 2px solid var(--danger);
                margin: 12px 0;
                background: var(--bg-elevated);
                font-size: 12px;
            }
            .status.success {
                border-color: rgba(34, 197, 94, 0.4);
                color: var(--success);
                background: rgba(34, 197, 94, 0.05);
            }

            .status.error {
                border-color: rgba(239, 68, 68, 0.4);
                color: var(--danger);
                background: rgba(239, 68, 68, 0.05);
            }
        `,
    ];

    static properties = {
        onContactSupport: { type: Function },
        onWithdrawConsent: { type: Function },
        protectedRecords: { type: Boolean },
        pendingDataAction: { type: String },
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        theme: { type: String },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        isClearing: { type: Boolean },
        isRestoring: { type: Boolean },
        clearStatusMessage: { type: String },
        clearStatusType: { type: String },
    };

    constructor() {
        super();
        this.pendingDataAction = '';
        this.onContactSupport = () => {};
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.keybinds = this.getDefaultKeybinds();
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onImageQualityChange = () => {};
        this.onLayoutModeChange = () => {};
        this.googleSearchEnabled = true;
        this.isClearing = false;
        this.isRestoring = false;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.backgroundTransparency = 0.8;
        this.fontSize = 20;
        this.audioMode = 'speaker_only';
        this.customPrompt = '';
        this.theme = 'dark';
        this._loadFromStorage();
    }

    getThemes() {
        return hintio.theme.getAll();
    }

    async _loadFromStorage() {
        try {
            const [prefs, keybinds] = await Promise.all([hintio.storage.getPreferences(), hintio.storage.getKeybinds()]);
            this.googleSearchEnabled = prefs.googleSearchEnabled ?? true;
            this.backgroundTransparency = prefs.backgroundTransparency ?? 0.8;
            this.fontSize = prefs.fontSize ?? 20;
            this.audioMode = prefs.audioMode ?? 'speaker_only';
            this.customPrompt = prefs.customPrompt ?? '';
            this.theme = prefs.theme ?? 'dark';
            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
            }
            this.updateBackgroundAppearance();
            this.updateFontSize();
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    getProfiles() {
        return [
            { value: 'interview', name: 'Job Interview' },
            { value: 'technical-interview', name: 'Technical Interview' },
            { value: 'sales', name: 'Sales Call' },
            { value: 'meeting', name: 'Business Meeting' },
            { value: 'presentation', name: 'Presentation' },
            { value: 'negotiation', name: 'Negotiation' },
            { value: 'exam', name: 'Exam Assistant' },
        ];
    }

    getLanguages() {
        return [
            { value: 'en-US', name: 'English (US)' },
            { value: 'en-GB', name: 'English (UK)' },
            { value: 'en-AU', name: 'English (Australia)' },
            { value: 'en-IN', name: 'English (India)' },
            { value: 'de-DE', name: 'German (Germany)' },
            { value: 'es-US', name: 'Spanish (US)' },
            { value: 'es-ES', name: 'Spanish (Spain)' },
            { value: 'fr-FR', name: 'French (France)' },
            { value: 'fr-CA', name: 'French (Canada)' },
            { value: 'hi-IN', name: 'Hindi (India)' },
            { value: 'pt-BR', name: 'Portuguese (Brazil)' },
            { value: 'ar-XA', name: 'Arabic (Generic)' },
            { value: 'id-ID', name: 'Indonesian (Indonesia)' },
            { value: 'it-IT', name: 'Italian (Italy)' },
            { value: 'ja-JP', name: 'Japanese (Japan)' },
            { value: 'tr-TR', name: 'Turkish (Turkey)' },
            { value: 'vi-VN', name: 'Vietnamese (Vietnam)' },
            { value: 'bn-IN', name: 'Bengali (India)' },
            { value: 'gu-IN', name: 'Gujarati (India)' },
            { value: 'kn-IN', name: 'Kannada (India)' },
            { value: 'ml-IN', name: 'Malayalam (India)' },
            { value: 'mr-IN', name: 'Marathi (India)' },
            { value: 'ta-IN', name: 'Tamil (India)' },
            { value: 'te-IN', name: 'Telugu (India)' },
            { value: 'nl-NL', name: 'Dutch (Netherlands)' },
            { value: 'ko-KR', name: 'Korean (South Korea)' },
            { value: 'cmn-CN', name: 'Mandarin Chinese (China)' },
            { value: 'pl-PL', name: 'Polish (Poland)' },
            { value: 'ru-RU', name: 'Russian (Russia)' },
            { value: 'th-TH', name: 'Thai (Thailand)' },
        ];
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

    getKeybindActions() {
        return [
            { key: 'moveUp', name: 'Move Window Up', description: 'Move the app window up' },
            { key: 'moveDown', name: 'Move Window Down', description: 'Move the app window down' },
            { key: 'moveLeft', name: 'Move Window Left', description: 'Move the app window left' },
            { key: 'moveRight', name: 'Move Window Right', description: 'Move the app window right' },
            { key: 'toggleVisibility', name: 'Toggle Visibility', description: 'Show or hide the app window' },
            { key: 'toggleClickThrough', name: 'Toggle Click-through', description: 'Enable or disable click-through mode' },
            { key: 'nextStep', name: 'Ask Next Step', description: 'Take screenshot and ask for next step' },
            { key: 'dualScreenshot', name: 'Multi Screenshot Answer', description: 'Capture up to 3 screenshots and send together' },
            { key: 'dualScreenshotFinish', name: 'Finish Multi Screenshot', description: 'Send captured screenshots early (min 2)' },
            { key: 'debugScreenshot', name: 'Debug Failed Test', description: 'Capture failed test output and get line-level fix guidance' },
            { key: 'previousResponse', name: 'Previous Response', description: 'Move to previous AI response' },
            { key: 'nextResponse', name: 'Next Response', description: 'Move to next AI response' },
            { key: 'scrollUp', name: 'Scroll Response Up', description: 'Scroll response content upward' },
            { key: 'scrollDown', name: 'Scroll Response Down', description: 'Scroll response content downward' },
        ];
    }

    async saveKeybinds() {
        await hintio.storage.setKeybinds(this.keybinds);
        if (window.electronAPI) {
            const ipcRenderer = window.electronAPI;
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    handleProfileSelect(e) {
        this.selectedProfile = e.target.value;
        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        this.onLanguageChange(this.selectedLanguage);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this.onImageQualityChange(this.selectedImageQuality);
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        this.onLayoutModeChange(this.layoutMode);
    }

    async handleCustomPromptInput(e) {
        this.customPrompt = e.target.value;
        await hintio.storage.updatePreference('customPrompt', this.customPrompt);
    }

    async handleAudioModeSelect(e) {
        this.audioMode = e.target.value;
        await hintio.storage.updatePreference('audioMode', this.audioMode);
        await hintio.refreshPreferencesCache();
        this.requestUpdate();
    }

    async handleThemeChange(e) {
        this.theme = e.target.value;
        await hintio.theme.save(this.theme);
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    async handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        await hintio.storage.updatePreference('googleSearchEnabled', this.googleSearchEnabled);
        if (window.electronAPI) {
            try {
                const ipcRenderer = window.electronAPI;
                await ipcRenderer.invoke('update-google-search-setting', this.googleSearchEnabled);
            } catch (error) {
                console.error('Failed to notify main process:', error);
            }
        }
        this.requestUpdate();
    }

    async handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        await hintio.storage.updatePreference('backgroundTransparency', this.backgroundTransparency);
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    updateBackgroundAppearance() {
        const colors = hintio.theme.get(this.theme);
        hintio.theme.applyBackgrounds(colors.background, this.backgroundTransparency);
    }

    async handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        await hintio.storage.updatePreference('fontSize', this.fontSize);
        this.updateFontSize();
        this.requestUpdate();
    }

    updateFontSize() {
        document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    handleKeybindChange(action, value) {
        this.keybinds = { ...this.keybinds, [action]: value };
        this.saveKeybinds();
        this.requestUpdate();
    }

    handleKeybindFocus(e) {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    }

    handleKeybindInput(e) {
        e.preventDefault();
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        let mainKey = e.key;

        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            default:
                if (e.key.length === 1) mainKey = e.key.toUpperCase();
                break;
        }

        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

        const action = e.target.dataset.action;
        const keybind = [...modifiers, mainKey].join('+');
        this.handleKeybindChange(action, keybind);
        e.target.value = keybind;
        e.target.blur();
    }

    async resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        await hintio.storage.setKeybinds(null);
        if (window.electronAPI) {
            const ipcRenderer = window.electronAPI;
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
        this.requestUpdate();
    }

    async restoreAllSettings() {
        if (this.isRestoring) return;
        if (this.pendingDataAction !== 'restore') {
            this.pendingDataAction = 'restore';
            return;
        }
        this.pendingDataAction = '';
        this.isRestoring = true;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.requestUpdate();
        try {
            // Restore all preferences to defaults
            const defaults = {
                customPrompt: '',
                interviewDomain: '',
                resumeText: '',
                resumeFileName: '',
                selectedProfile: 'interview',
                selectedLanguage: 'en-US',
                selectedScreenshotInterval: '5',
                selectedImageQuality: 'medium',
                audioMode: 'speaker_only',
                fontSize: 20,
                backgroundTransparency: 0.8,
                googleSearchEnabled: false,
                theme: 'dark',
            };
            for (const [key, value] of Object.entries(defaults)) {
                await hintio.storage.updatePreference(key, value);
            }

            // Restore keybinds
            this.keybinds = this.getDefaultKeybinds();
            await hintio.storage.setKeybinds(null);
            if (window.electronAPI) {
                const ipcRenderer = window.electronAPI;
                ipcRenderer.send('update-keybinds', this.keybinds);
            }

            // Apply to local state
            this.selectedProfile = defaults.selectedProfile;
            this.selectedLanguage = defaults.selectedLanguage;
            this.selectedImageQuality = defaults.selectedImageQuality;
            this.audioMode = defaults.audioMode;
            this.fontSize = defaults.fontSize;
            this.backgroundTransparency = defaults.backgroundTransparency;
            this.googleSearchEnabled = defaults.googleSearchEnabled;
            this.customPrompt = defaults.customPrompt;
            this.theme = defaults.theme;

            // Notify parent callbacks
            this.onProfileChange(defaults.selectedProfile);
            this.onLanguageChange(defaults.selectedLanguage);
            this.onImageQualityChange(defaults.selectedImageQuality);

            // Apply visual changes
            this.updateBackgroundAppearance();
            this.updateFontSize();
            await hintio.theme.save(defaults.theme);

            this.clearStatusMessage = 'All settings restored to defaults';
            this.clearStatusType = 'success';
        } catch (error) {
            console.error('Error restoring settings:', error);
            this.clearStatusMessage = `Error restoring settings: ${error.message}`;
            this.clearStatusType = 'error';
        } finally {
            this.isRestoring = false;
            this.requestUpdate();
        }
    }

    async clearLocalData() {
        if (this.isClearing) return;
        if (this.pendingDataAction !== 'delete') {
            this.pendingDataAction = 'delete';
            return;
        }
        this.pendingDataAction = '';
        this.isClearing = true;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.requestUpdate();
        try {
            await hintio.storage.clearAll();
            this.clearStatusMessage = 'Successfully cleared all local data';
            this.clearStatusType = 'success';
            this.requestUpdate();
            setTimeout(() => {
                this.clearStatusMessage = 'Closing application...';
                this.requestUpdate();
                setTimeout(async () => {
                    if (window.electronAPI) {
                        const ipcRenderer = window.electronAPI;
                        await ipcRenderer.invoke('quit-application');
                    }
                }, 1000);
            }, 2000);
        } catch (error) {
            console.error('Error clearing data:', error);
            this.clearStatusMessage = `Error clearing data: ${error.message}`;
            this.clearStatusType = 'error';
        } finally {
            this.isClearing = false;
            this.requestUpdate();
        }
    }

    renderAudioSection() {
        return html`
            <section class="surface">
                <div class="surface-header">
                    <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="mic"></hintio-icon>
                    <div class="surface-title">Audio Input</div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Audio Mode</label>
                        <select class="control" .value=${this.audioMode} @change=${this.handleAudioModeSelect}>
                            <option value="speaker_only">Speaker Only (Interviewer)</option>
                            <option value="mic_only">Microphone Only (Me)</option>
                            <option value="both">Both Speaker and Microphone</option>
                            <option value="none">No Audio (Screenshots Only)</option>
                        </select>
                    </div>
                    ${this.audioMode !== 'speaker_only'
                        ? html` <div class="warning-callout">May cause unexpected behavior. Only change this if you know what you're doing.</div> `
                        : ''}
                    <div class="form-group">
                        <label class="form-label">Image Quality</label>
                        <select class="control" .value=${this.selectedImageQuality} @change=${this.handleImageQualitySelect}>
                            <option value="high">High Quality</option>
                            <option value="medium">Medium Quality</option>
                            <option value="low">Low Quality</option>
                        </select>
                    </div>
                </div>
            </section>
        `;
    }

    renderLanguageSection() {
        return html`
            <section class="surface">
                <div class="surface-header">
                    <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="translate"></hintio-icon>
                    <div class="surface-title">Language</div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Speech Language</label>
                        <select class="control" .value=${this.selectedLanguage} @change=${this.handleLanguageSelect}>
                            ${this.getLanguages().map(language => html`<option value=${language.value}>${language.name}</option>`)}
                        </select>
                    </div>
                </div>
            </section>
        `;
    }

    renderAppearanceSection() {
        return html`
            <section class="surface">
                <div class="surface-header">
                    <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="palette"></hintio-icon>
                    <div class="surface-title">Appearance</div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Theme</label>
                        <select class="control" .value=${this.theme} @change=${this.handleThemeChange}>
                            ${this.getThemes().map(theme => html`<option value=${theme.value}>${theme.name}</option>`)}
                        </select>
                    </div>
                    <div class="form-group slider-wrap">
                        <div class="slider-header">
                            <label class="form-label">Background Transparency</label>
                            <span class="slider-value">${Math.round(this.backgroundTransparency * 100)}%</span>
                        </div>
                        <input
                            class="slider-input"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            .value=${this.backgroundTransparency}
                            @input=${this.handleBackgroundTransparencyChange}
                        />
                    </div>
                    <div class="form-group slider-wrap">
                        <div class="slider-header">
                            <label class="form-label">Response Font Size</label>
                            <span class="slider-value">${this.fontSize}px</span>
                        </div>
                        <input
                            class="slider-input"
                            type="range"
                            min="12"
                            max="32"
                            step="1"
                            .value=${this.fontSize}
                            @input=${this.handleFontSizeChange}
                        />
                    </div>
                </div>
            </section>
        `;
    }

    renderKeyboardSection() {
        return html`
            <section class="surface">
                <div class="surface-header">
                    <hintio-icon class="icon" style="font-size:16px;color:#6366F1" name="keyboard"></hintio-icon>
                    <div class="surface-title">Keyboard Shortcuts</div>
                </div>
                ${this.getKeybindActions().map(
                    action => html`
                        <div class="keybind-row">
                            <span class="keybind-name">${action.name}</span>
                            <input
                                type="text"
                                class="control keybind-input"
                                .value=${this.keybinds[action.key]}
                                data-action=${action.key}
                                @keydown=${this.handleKeybindInput}
                                @focus=${this.handleKeybindFocus}
                                readonly
                            />
                        </div>
                    `
                )}
                <div style="margin-top: var(--space-sm);">
                    <button class="control" style="width:auto;padding:8px 10px;" @click=${this.resetKeybinds}>Reset to defaults</button>
                </div>
            </section>
        `;
    }

    renderPrivacySection() {
        return html`
            <section class="surface privacy-surface" aria-labelledby="privacy-title">
                <div class="surface-header">
                    <hintio-icon class="icon" style="color:var(--accent)" name="shield"></hintio-icon>
                    <div class="surface-title" id="privacy-title">Privacy & Data</div>
                </div>
                <p class="privacy-intro">Know what enters a session, where it is processed, and what stays on this device.</p>
                <dl class="data-flow">
                    <div>
                        <dt>01 · Capture</dt>
                        <dd>
                            Your selected audio mode and screen-capture controls determine the context available to Hintio. Choose
                            <strong>No Audio</strong> above for screenshot-only sessions. Only capture content you have permission to use.
                        </dd>
                    </div>
                    <div>
                        <dt>02 · Processing</dt>
                        <dd>
                            Cloud providers receive the session context sent to them, which can include audio or transcripts, screenshots, your
                            resume, and custom instructions. BYOK uses your selected provider; it does not mean processing stays local. Local mode
                            uses Ollama and on-device transcription after setup. Access validation and model downloads can still need a connection.
                        </dd>
                    </div>
                    <div>
                        <dt>03 · Local records</dt>
                        <dd>
                            Hintio stores configuration, provider credentials, preferences, and session history in its local
                            <code>hintio-config</code> folder. History can include responses, transcripts, and screen analyses. Treat this folder and
                            any exports as private.
                            ${this.protectedRecords
                                ? 'This Store profile uses Windows-backed encryption at rest; exported copies are not protected by that encryption.'
                                : 'This EXE profile uses local JSON files without application encryption.'}
                        </dd>
                    </div>
                </dl>
                <div class="privacy-support">
                    <button class="control" @click=${() => this.onWithdrawConsent?.()}>Withdraw cloud-processing consent</button>
                    <p>Stops an active session and returns to the privacy step. Saved records are retained. You can agree again later.</p>
                </div>
                <div class="privacy-support">
                    <strong>Questions or a data request?</strong>
                    <p>
                        Contact support for questions about provider processing, retention, or information associated with your access. Deleting local
                        files does not delete data held by an AI or payment provider.
                    </p>
                    <button class="control" @click=${this.onContactSupport}>Contact Hintio support <span aria-hidden="true">↗</span></button>
                </div>
            </section>
            <section class="surface danger-surface">
                <div class="surface-header">
                    <hintio-icon class="icon" style="color:var(--danger)" name="delete_forever"></hintio-icon>
                    <div class="surface-title">Local data controls</div>
                </div>
                <p class="privacy-intro">
                    Restore settings resets preferences, shortcuts, saved resume text, and custom instructions. Delete local data resets the entire
                    Hintio configuration folder, including saved credentials and history, then closes the app. Exported copies are separate.
                </p>
                ${this.pendingDataAction
                    ? html`<div class="data-confirmation" role="alert">
                          <strong
                              >${this.pendingDataAction === 'delete'
                                  ? 'Delete the local Hintio configuration and history?'
                                  : 'Reset your preferences and saved AI context?'}</strong
                          >
                          <p>
                              ${this.pendingDataAction === 'delete'
                                  ? 'This cannot be undone in the app. Your saved provider keys and local session records will be removed.'
                                  : 'Your resume text, custom instructions, appearance, and shortcuts return to their defaults. Session history is retained.'}
                          </p>
                          <button
                              class="control"
                              @click=${() => {
                                  this.pendingDataAction = '';
                              }}
                          >
                              Cancel
                          </button>
                      </div>`
                    : ''}
                <div class="data-actions">
                    <button class="danger-button" @click=${this.restoreAllSettings} ?disabled=${this.isRestoring || this.isClearing}>
                        ${this.isRestoring ? 'Restoring…' : this.pendingDataAction === 'restore' ? 'Confirm reset settings' : 'Restore settings'}
                    </button>
                    <button class="danger-button" @click=${this.clearLocalData} ?disabled=${this.isClearing || this.isRestoring}>
                        ${this.isClearing ? 'Deleting…' : this.pendingDataAction === 'delete' ? 'Confirm delete local data' : 'Delete local data'}
                    </button>
                </div>
                ${this.clearStatusMessage
                    ? html`<div class="status ${this.clearStatusType === 'success' ? 'success' : 'error'}" role="status">
                          ${this.clearStatusMessage}
                      </div>`
                    : ''}
            </section>
        `;
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div class="settings-banner">
                        <div>
                            <div class="settings-banner-title">Settings</div>
                            <div class="settings-banner-sub">Configure runtime parameters</div>
                        </div>
                    </div>
                    ${this.renderAudioSection()} ${this.renderLanguageSection()} ${this.renderAppearanceSection()} ${this.renderKeyboardSection()}
                    ${this.renderPrivacySection()}
                </div>
            </div>
        `;
    }
}

customElements.define('customize-view', CustomizeView);
